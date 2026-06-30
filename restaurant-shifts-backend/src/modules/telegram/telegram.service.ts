import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// Thin wrapper around the Telegram Bot API used to push notifications to
// users outside of the Mini App (TOR section 16). Uses the bot token from
// TELEGRAM_BOT_TOKEN — never log or hardcode this value.
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly config: ConfigService) {}

  private get apiBase() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    return `https://api.telegram.org/bot${token}`;
  }

  async sendMessage(chatId: string | number, text: string) {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — skipping Telegram push');
      return null;
    }
    try {
      const { data } = await axios.post(`${this.apiBase}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      });
      return data;
    } catch (error) {
      this.logger.error(`Failed to send Telegram message: ${error.message}`);
      return null;
    }
  }

  async setWebhook(url: string, secretToken: string) {
    return axios.post(`${this.apiBase}/setWebhook`, {
      url,
      secret_token: secretToken,
    });
  }
}
