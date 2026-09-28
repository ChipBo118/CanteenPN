import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Public, Roles } from '../../common/auth.decorators';
import type { AuthUser } from '../../common/auth-user';
import { CreateReviewDto, ModerateReviewDto } from './engagement.dto';
import { EngagementService } from './engagement.service';
@ApiTags('favorites', 'reviews') @Controller()
export class EngagementController { constructor(private readonly engagement: EngagementService) {} @ApiBearerAuth() @Roles(Role.STUDENT) @Get('favorites') favorites(@CurrentUser() user: AuthUser) { return this.engagement.favorites(user.sub); } @ApiBearerAuth() @Roles(Role.STUDENT) @Post('favorites/:productId') favorite(@CurrentUser() user: AuthUser, @Param('productId') productId: string) { return this.engagement.favorite(user.sub, productId); } @ApiBearerAuth() @Roles(Role.STUDENT) @Delete('favorites/:productId') unfavorite(@CurrentUser() user: AuthUser, @Param('productId') productId: string) { return this.engagement.unfavorite(user.sub, productId); } @Public() @Get('products/:productId/reviews') reviews(@Param('productId') productId: string) { return this.engagement.productReviews(productId); } @ApiBearerAuth() @Roles(Role.STUDENT) @Post('reviews') review(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) { return this.engagement.review(user.sub, dto); } @ApiBearerAuth() @Roles(Role.ADMIN) @Get('admin/reviews') adminReviews() { return this.engagement.adminReviews(); } @ApiBearerAuth() @Roles(Role.ADMIN) @Patch('admin/reviews/:id') moderate(@Param('id') id: string, @Body() dto: ModerateReviewDto) { return this.engagement.moderate(id, dto); } }

