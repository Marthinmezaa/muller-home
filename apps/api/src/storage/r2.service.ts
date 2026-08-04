import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

export const ALLOWED_PROOF_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
export const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const PRESIGNED_URL_TTL_SECONDS = 10 * 60; // 10 min

/// Storage privado en R2 (S3-compatible) para el comprobante de pago.
/// El bucket nunca es publico: los objetos se leen via URL prefirmada.
@Injectable()
export class R2Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID');
    this.bucket = config.get<string>('R2_BUCKET_NAME') ?? '';
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get<string>('R2_ACCESS_KEY_ID') ?? '',
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  async uploadProof(file?: Express.Multer.File): Promise<string> {
    this.validateProof(file);

    const key = `proofs/${randomUUID()}-${file!.originalname}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file!.buffer,
        ContentType: file!.mimetype,
      }),
    );

    return key;
  }

  getPresignedUrl(key: string): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
    });
  }

  private validateProof(file?: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('El comprobante de pago es requerido');
    }
    if (!ALLOWED_PROOF_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('El comprobante debe ser una imagen o un PDF');
    }
    if (file.size > MAX_PROOF_SIZE_BYTES) {
      throw new BadRequestException('El comprobante supera el tamano maximo (5MB)');
    }
  }
}
