import { HttpStatus, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../prisma.service';
import { CreateReviewDto, ModerateReviewDto } from './engagement.dto';

@Injectable()
export class EngagementService {
  constructor(private readonly prisma: PrismaService) {}
  private async profile(userId: string) { const profile = await this.prisma.studentProfile.findUnique({ where: { userId } }); if (!profile) throw new ApiError(HttpStatus.FORBIDDEN, 'STUDENT_PROFILE_REQUIRED', 'Chỉ sinh viên được dùng tính năng này.'); return profile; }
  async favorites(userId: string) { const profile = await this.profile(userId); return this.prisma.favorite.findMany({ where: { studentProfileId: profile.id }, include: { product: { include: { category: true } } }, orderBy: { createdAt: 'desc' } }); }
  async favorite(userId: string, productId: string) { const profile = await this.profile(userId); await this.prisma.product.findFirstOrThrow({ where: { id: productId, deletedAt: null } }); return this.prisma.favorite.upsert({ where: { studentProfileId_productId: { studentProfileId: profile.id, productId } }, update: {}, create: { studentProfileId: profile.id, productId } }); }
  async unfavorite(userId: string, productId: string) { const profile = await this.profile(userId); await this.prisma.favorite.deleteMany({ where: { studentProfileId: profile.id, productId } }); return { ok: true }; }
  productReviews(productId: string) { return this.prisma.review.findMany({ where: { productId, isHidden: false }, include: { studentProfile: { select: { studentDirectory: { select: { fullName: true } } } } }, orderBy: { createdAt: 'desc' } }); }
  async review(userId: string, dto: CreateReviewDto) { const profile = await this.profile(userId); return this.prisma.$transaction(async tx => { const item = await tx.orderItem.findFirst({ where: { ...(dto.orderItemId ? { id: dto.orderItemId } : { orderId: dto.orderId, productId: dto.productId }), productId: { not: null }, order: { studentProfileId: profile.id, status: OrderStatus.COMPLETED } } }); if (!item?.productId) throw new ApiError(HttpStatus.FORBIDDEN, 'REVIEW_NOT_ALLOWED', 'Bạn chỉ có thể đánh giá món đã mua trong đơn hoàn tất.'); const review = await tx.review.create({ data: { studentProfileId: profile.id, productId: item.productId, orderItemId: item.id, rating: dto.rating, comment: dto.comment ?? dto.content } }); const stats = await tx.review.aggregate({ where: { productId: item.productId, isHidden: false }, _avg: { rating: true }, _count: true }); await tx.product.update({ where: { id: item.productId }, data: { averageRating: new Prisma.Decimal(stats._avg.rating ?? 0), totalReviews: stats._count } }); return review; }); }
  adminReviews() { return this.prisma.review.findMany({ include: { product: true, studentProfile: { include: { studentDirectory: true } }, orderItem: { include: { order: true } } }, orderBy: { createdAt: 'desc' } }); }
  async moderate(id: string, dto: ModerateReviewDto) { const review = await this.prisma.review.update({ where: { id }, data: { isHidden: dto.isHidden, hiddenReason: dto.reason } }); const stats = await this.prisma.review.aggregate({ where: { productId: review.productId, isHidden: false }, _avg: { rating: true }, _count: true }); await this.prisma.product.update({ where: { id: review.productId }, data: { averageRating: new Prisma.Decimal(stats._avg.rating ?? 0), totalReviews: stats._count } }); return review; }
}

