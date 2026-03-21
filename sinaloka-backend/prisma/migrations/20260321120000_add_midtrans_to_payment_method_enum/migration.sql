-- Add MIDTRANS value to PaymentMethod enum
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'MIDTRANS';
