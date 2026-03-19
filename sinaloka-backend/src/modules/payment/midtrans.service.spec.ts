import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { MidtransService } from './midtrans.service.js';

describe('MidtransService', () => {
  let service: MidtransService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MidtransService],
    }).compile();

    service = module.get<MidtransService>(MidtransService);
  });

  describe('verifySignature', () => {
    it('should return true for a valid signature', () => {
      const orderId = 'order-123';
      const statusCode = '200';
      const grossAmount = '150000.00';
      const serverKey = 'my-server-key';

      const expectedHash = crypto
        .createHash('sha512')
        .update(orderId + statusCode + grossAmount + serverKey)
        .digest('hex');

      const result = service.verifySignature({
        orderId,
        statusCode,
        grossAmount,
        serverKey,
        signatureKey: expectedHash,
      });

      expect(result).toBe(true);
    });

    it('should return false for an invalid signature', () => {
      const result = service.verifySignature({
        orderId: 'order-123',
        statusCode: '200',
        grossAmount: '150000.00',
        serverKey: 'my-server-key',
        signatureKey: 'invalid-signature',
      });

      expect(result).toBe(false);
    });

    it('should return false if server key is wrong', () => {
      const orderId = 'order-123';
      const statusCode = '200';
      const grossAmount = '150000.00';
      const correctServerKey = 'correct-key';
      const wrongServerKey = 'wrong-key';

      const validHash = crypto
        .createHash('sha512')
        .update(orderId + statusCode + grossAmount + correctServerKey)
        .digest('hex');

      const result = service.verifySignature({
        orderId,
        statusCode,
        grossAmount,
        serverKey: wrongServerKey,
        signatureKey: validHash,
      });

      expect(result).toBe(false);
    });

    it('should return false if order ID is tampered', () => {
      const statusCode = '200';
      const grossAmount = '150000.00';
      const serverKey = 'my-server-key';

      const validHash = crypto
        .createHash('sha512')
        .update('original-order' + statusCode + grossAmount + serverKey)
        .digest('hex');

      const result = service.verifySignature({
        orderId: 'tampered-order',
        statusCode,
        grossAmount,
        serverKey,
        signatureKey: validHash,
      });

      expect(result).toBe(false);
    });
  });

  describe('mapTransactionStatus', () => {
    it('should return PAID for settlement', () => {
      expect(service.mapTransactionStatus('settlement')).toBe('PAID');
    });

    it('should return PAID for capture', () => {
      expect(service.mapTransactionStatus('capture')).toBe('PAID');
    });

    it('should return PENDING for expire', () => {
      expect(service.mapTransactionStatus('expire')).toBe('PENDING');
    });

    it('should return null for pending', () => {
      expect(service.mapTransactionStatus('pending')).toBeNull();
    });

    it('should return null for deny', () => {
      expect(service.mapTransactionStatus('deny')).toBeNull();
    });

    it('should return null for cancel', () => {
      expect(service.mapTransactionStatus('cancel')).toBeNull();
    });

    it('should return null for unknown status', () => {
      expect(service.mapTransactionStatus('unknown_status')).toBeNull();
    });
  });
});
