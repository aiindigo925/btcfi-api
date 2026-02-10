use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("BTCFiStake1111111111111111111111111111111");

/// BTCFi Staking Escrow — Solana (USDC)
///
/// Agents stake USDC to unlock higher rate limits and priority access.
/// Credits accrue proportional to stake per slot.
/// Fomo3D mechanic: last staker in 24h window earns 10% bonus credits.
///
/// Tiers:
///   Free    = 0 USDC         → 100 req/min
///   Staker  = 100+ USDC      → 1000 req/min + priority
///   Whale   = 1000+ USDC     → unlimited + priority + early features

#[program]
pub mod btcfi_staking_escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, credit_rate: u64) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.usdc_mint = ctx.accounts.usdc_mint.key();
        state.vault = ctx.accounts.vault.key();
        state.credit_rate = credit_rate;
        state.total_staked = 0;
        state.last_staker = Pubkey::default();
        state.last_stake_time = 0;
        state.bump = ctx.bumps.state;
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, StakingError::ZeroAmount);

        let user_stake = &mut ctx.accounts.user_stake;
        let clock = Clock::get()?;
        accrue_credits(user_stake, &clock, ctx.accounts.state.credit_rate);

        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        user_stake.amount += amount;
        user_stake.user = ctx.accounts.user.key();
        if user_stake.staked_at == 0 {
            user_stake.staked_at = clock.slot;
        }
        user_stake.last_credit_slot = clock.slot;

        let state = &mut ctx.accounts.state;
        state.total_staked += amount;
        state.last_staker = ctx.accounts.user.key();
        state.last_stake_time = clock.unix_timestamp;

        emit!(StakeEvent {
            user: ctx.accounts.user.key(),
            amount,
            total: user_stake.amount,
            tier: get_tier(user_stake.amount),
        });
        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        let user_stake = &mut ctx.accounts.user_stake;
        require!(user_stake.amount > 0, StakingError::NoStake);

        let clock = Clock::get()?;
        accrue_credits(user_stake, &clock, ctx.accounts.state.credit_rate);

        let amount = user_stake.amount;
        user_stake.amount = 0;
        user_stake.staked_at = 0;

        let seeds = &[b"state".as_ref(), &[ctx.accounts.state.bump]];
        let signer = &[&seeds[..]];
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user_token.to_account_info(),
                authority: ctx.accounts.state.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_ctx, amount)?;

        ctx.accounts.state.total_staked = ctx.accounts.state.total_staked.saturating_sub(amount);
        emit!(UnstakeEvent { user: ctx.accounts.user.key(), amount });
        Ok(())
    }

    pub fn claim_fomo_bonus(ctx: Context<ClaimFomoBonus>) -> Result<()> {
        let state = &ctx.accounts.state;
        let clock = Clock::get()?;
        require!(state.last_staker == ctx.accounts.user.key(), StakingError::NotLastStaker);
        require!(clock.unix_timestamp > state.last_stake_time + 86400, StakingError::FomoWindowOpen);

        let user_stake = &mut ctx.accounts.user_stake;
        accrue_credits(user_stake, &clock, state.credit_rate);
        let bonus = user_stake.credits / 10;
        user_stake.credits += bonus;

        let state = &mut ctx.accounts.state;
        state.last_staker = Pubkey::default();
        state.last_stake_time = 0;

        emit!(FomoBonusEvent { user: ctx.accounts.user.key(), bonus });
        Ok(())
    }

    pub fn get_stake(ctx: Context<GetStake>) -> Result<()> {
        let user_stake = &ctx.accounts.user_stake;
        let clock = Clock::get()?;
        let pending = compute_pending(user_stake, &clock, ctx.accounts.state.credit_rate);
        emit!(StakeInfoEvent {
            user: user_stake.user,
            amount: user_stake.amount,
            tier: get_tier(user_stake.amount),
            credits: user_stake.credits,
            pending_credits: pending,
            staked_at: user_stake.staked_at,
        });
        Ok(())
    }

    pub fn set_credit_rate(ctx: Context<AdminAction>, new_rate: u64) -> Result<()> {
        ctx.accounts.state.credit_rate = new_rate;
        Ok(())
    }
}

// ============ HELPERS ============

const TIER_STAKER: u64 = 100_000_000;
const TIER_WHALE: u64 = 1_000_000_000;

fn get_tier(amount: u64) -> u8 {
    if amount >= TIER_WHALE { 2 } else if amount >= TIER_STAKER { 1 } else { 0 }
}

fn accrue_credits(stake: &mut Account<UserStake>, clock: &Clock, rate: u64) {
    if stake.amount == 0 || stake.last_credit_slot >= clock.slot { return; }
    let slots = clock.slot - stake.last_credit_slot;
    let new = (stake.amount as u128).checked_mul(slots as u128).unwrap_or(0)
        .checked_mul(rate as u128).unwrap_or(0) / 1_000_000_000_000_000_000u128;
    stake.credits += new as u64;
    stake.last_credit_slot = clock.slot;
}

fn compute_pending(stake: &Account<UserStake>, clock: &Clock, rate: u64) -> u64 {
    if stake.amount == 0 || stake.last_credit_slot >= clock.slot { return 0; }
    let slots = clock.slot - stake.last_credit_slot;
    ((stake.amount as u128).checked_mul(slots as u128).unwrap_or(0)
        .checked_mul(rate as u128).unwrap_or(0) / 1_000_000_000_000_000_000u128) as u64
}

// ============ ACCOUNTS ============

#[account]
pub struct StakingState {
    pub authority: Pubkey,
    pub usdc_mint: Pubkey,
    pub vault: Pubkey,
    pub credit_rate: u64,
    pub total_staked: u64,
    pub last_staker: Pubkey,
    pub last_stake_time: i64,
    pub bump: u8,
}

#[account]
pub struct UserStake {
    pub user: Pubkey,
    pub amount: u64,
    pub staked_at: u64,
    pub last_credit_slot: u64,
    pub credits: u64,
}

// ============ CONTEXTS ============

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 153, seeds = [b"state"], bump)]
    pub state: Account<'info, StakingState>,
    /// CHECK: USDC mint
    pub usdc_mint: UncheckedAccount<'info>,
    #[account(init, payer = authority, token::mint = usdc_mint, token::authority = state)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, StakingState>,
    #[account(init_if_needed, payer = user, space = 8 + 64, seeds = [b"user_stake", user.key().as_ref()], bump)]
    pub user_stake: Account<'info, UserStake>,
    #[account(mut, constraint = vault.key() == state.vault)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_token.owner == user.key())]
    pub user_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, StakingState>,
    #[account(mut, seeds = [b"user_stake", user.key().as_ref()], bump, constraint = user_stake.user == user.key())]
    pub user_stake: Account<'info, UserStake>,
    #[account(mut, constraint = vault.key() == state.vault)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_token.owner == user.key())]
    pub user_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimFomoBonus<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, StakingState>,
    #[account(mut, seeds = [b"user_stake", user.key().as_ref()], bump, constraint = user_stake.user == user.key())]
    pub user_stake: Account<'info, UserStake>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetStake<'info> {
    #[account(seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, StakingState>,
    #[account(seeds = [b"user_stake", user.key().as_ref()], bump)]
    pub user_stake: Account<'info, UserStake>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump, constraint = state.authority == authority.key())]
    pub state: Account<'info, StakingState>,
    pub authority: Signer<'info>,
}

// ============ EVENTS ============

#[event]
pub struct StakeEvent { pub user: Pubkey, pub amount: u64, pub total: u64, pub tier: u8 }
#[event]
pub struct UnstakeEvent { pub user: Pubkey, pub amount: u64 }
#[event]
pub struct FomoBonusEvent { pub user: Pubkey, pub bonus: u64 }
#[event]
pub struct StakeInfoEvent { pub user: Pubkey, pub amount: u64, pub tier: u8, pub credits: u64, pub pending_credits: u64, pub staked_at: u64 }

// ============ ERRORS ============

#[error_code]
pub enum StakingError {
    #[msg("Amount must be > 0")]
    ZeroAmount,
    #[msg("No active stake")]
    NoStake,
    #[msg("Not the last staker")]
    NotLastStaker,
    #[msg("Fomo3D window still open")]
    FomoWindowOpen,
}
