use anchor_lang::prelude::*;

// Program ID - will be auto-generated after first build
declare_id!("YourProgramIdWillGoHere");

#[program]
pub mod solpay {
    use super::*;

    // Initialize payment account
    pub fn initialize_payment(
        ctx: Context<InitializePayment>,
        amount: u64,
        recipient: Pubkey,
    ) -> Result<()> {
        let payment = &mut ctx.accounts.payment;
        payment.sender = ctx.accounts.sender.key();
        payment.recipient = recipient;
        payment.amount = amount;
        payment.status = PaymentStatus::Pending;
        payment.timestamp = Clock::get()?.unix_timestamp;
        msg!("Payment initialized: {} SOL", amount);
        Ok(())
    }

    // Process payment confirmation
    pub fn confirm_payment(ctx: Context<ConfirmPayment>) -> Result<()> {
        let payment = &mut ctx.accounts.payment;
        require!(
            payment.status == PaymentStatus::Pending,
            PaymentError::AlreadyProcessed
        );
        payment.status = PaymentStatus::Completed;
        msg!("Payment confirmed");
        Ok(())
    }

    // Cancel payment
    pub fn cancel_payment(ctx: Context<CancelPayment>) -> Result<()> {
        let payment = &mut ctx.accounts.payment;
        require!(
            payment.sender == ctx.accounts.sender.key(),
            PaymentError::Unauthorized
        );
        payment.status = PaymentStatus::Cancelled;
        msg!("Payment cancelled");
        Ok(())
    }
}

// Account validation structs
#[derive(Accounts)]
pub struct InitializePayment<'info> {
    #[account(
        init,
        payer = sender,
        space = 8 + Payment::INIT_SPACE,
        seeds = [b"payment", sender.key().as_ref()],
        bump
    )]
    pub payment: Account<'info, Payment>,
    #[account(mut)]
    pub sender: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ConfirmPayment<'info> {
    #[account(mut)]
    pub payment: Account<'info, Payment>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelPayment<'info> {
    #[account(
        mut,
        seeds = [b"payment", sender.key().as_ref()],
        bump
    )]
    pub payment: Account<'info, Payment>,
    pub sender: Signer<'info>,
}

// Payment account structure
#[account]
#[derive(InitSpace)]
pub struct Payment {
    pub sender: Pubkey,      // 32 bytes
    pub recipient: Pubkey,   // 32 bytes
    pub amount: u64,         // 8 bytes
    pub status: PaymentStatus, // 1 byte
    pub timestamp: i64,      // 8 bytes
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum PaymentStatus {
    Pending,
    Completed,
    Cancelled,
}

#[error_code]
pub enum PaymentError {
    #[msg("Payment already processed")]
    AlreadyProcessed,
    #[msg("Unauthorized access")]
    Unauthorized,
}
