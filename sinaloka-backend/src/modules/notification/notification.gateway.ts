import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';

interface SseClient {
  res: Response;
  userId: string;
}

@Injectable()
export class NotificationGateway {
  private readonly logger = new Logger(NotificationGateway.name);
  private connections = new Map<string, Set<SseClient>>();

  addClient(institutionId: string, userId: string, res: Response) {
    if (!this.connections.has(institutionId)) {
      this.connections.set(institutionId, new Set());
    }
    const client: SseClient = { res, userId };
    this.connections.get(institutionId)!.add(client);

    this.logger.debug(
      `SSE client connected: user=${userId}, institution=${institutionId}, total=${this.connections.get(institutionId)!.size}`,
    );

    res.on('close', () => {
      this.connections.get(institutionId)?.delete(client);
      if (this.connections.get(institutionId)?.size === 0) {
        this.connections.delete(institutionId);
      }
      this.logger.debug(`SSE client disconnected: user=${userId}`);
    });
  }

  pushToInstitution(
    institutionId: string,
    notification: Record<string, unknown>,
  ) {
    const clients = this.connections.get(institutionId);
    if (!clients || clients.size === 0) return;

    const data = JSON.stringify(notification);
    for (const client of clients) {
      try {
        client.res.write(`data: ${data}\n\n`);
      } catch {
        clients.delete(client);
        this.logger.debug(`Removed dead SSE client: user=${client.userId}`);
      }
    }
  }

  getConnectionCount(institutionId?: string): number {
    if (institutionId) {
      return this.connections.get(institutionId)?.size ?? 0;
    }
    let total = 0;
    for (const clients of this.connections.values()) {
      total += clients.size;
    }
    return total;
  }
}
