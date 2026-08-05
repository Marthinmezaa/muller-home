import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

export const ALLOWED_PROOF_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
export const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MEDIA_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);
export const MAX_MEDIA_SIZE_BYTES = 200 * 1024 * 1024; // 200MB (video de drone)
const PRESIGNED_URL_TTL_SECONDS = 10 * 60; // 10 min
// ponytail: media de propiedad publicada se sirve con URL prefirmada de
// vida mas larga (se regenera en cada fetch, sin cache de por medio, asi
// que 1h alcanza) en vez de mover el bucket a publico + dominio custom.
// Si el trafico lo justifica, pasar a un bucket publico y devolver la key
// directo.
const MEDIA_URL_TTL_SECONDS = 60 * 60; // 1 hora

interface UploadRules {
  allowedMimeTypes: Set<string>;
  maxSizeBytes: number;
  prefix: string;
  fieldLabel: string;
}

/// Storage privado en R2 (S3-compatible) para comprobantes de pago y media
/// de propiedades. El bucket nunca es publico: los objetos se leen via URL
/// prefirmada (el comprobante) o se sirven directo por su key (media publica
/// de una propiedad publicada, resuelto por el modulo de propiedades).
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

  uploadProof(file?: Express.Multer.File): Promise<string> {
    return this.upload(file, {
      allowedMimeTypes: ALLOWED_PROOF_MIME_TYPES,
      maxSizeBytes: MAX_PROOF_SIZE_BYTES,
      prefix: 'proofs',
      fieldLabel: 'El comprobante de pago',
    });
  }

  uploadPropertyMedia(file?: Express.Multer.File): Promise<string> {
    return this.upload(file, {
      allowedMimeTypes: ALLOWED_MEDIA_MIME_TYPES,
      maxSizeBytes: MAX_MEDIA_SIZE_BYTES,
      prefix: 'properties',
      fieldLabel: 'La foto o el video',
    });
  }

  getPresignedUrl(key: string): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
    });
  }

  getMediaUrl(key: string): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: MEDIA_URL_TTL_SECONDS,
    });
  }

  private async upload(file: Express.Multer.File | undefined, rules: UploadRules): Promise<string> {
    this.validate(file, rules);

    const key = `${rules.prefix}/${randomUUID()}-${file!.originalname}`;
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

  private validate(file: Express.Multer.File | undefined, rules: UploadRules): void {
    if (!file) {
      throw new BadRequestException(`${rules.fieldLabel} es requerido`);
    }
    if (!rules.allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException(`${rules.fieldLabel} tiene un formato no soportado`);
    }
    if (file.size > rules.maxSizeBytes) {
      throw new BadRequestException(`${rules.fieldLabel} supera el tamano maximo permitido`);
    }
  }
}
