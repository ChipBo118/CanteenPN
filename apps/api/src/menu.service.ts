import {BadRequestException, Injectable} from '@nestjs/common';
import {PrismaService} from './prisma.service';
import {CreateMenuItemDto, SetStockDto} from './menu.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async list(dateInput?: string, includeInactive = false) {
    const date = day(dateInput);
    const items = await this.prisma.menuItem.findMany({
      where: includeInactive ? {} : {active: true},
      include: {category: true, images: {orderBy: {isPrimary: 'desc'}}, stocks: {where: {date}}},
      orderBy: {name: 'asc'},
    });
    return items.map(item => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      category: item.category.name,
      categoryId: item.categoryId,
      price: Number(item.price),
      prepMinutes: item.prepMinutes,
      vegetarian: item.vegetarian,
      spicyLevel: item.spicyLevel,
      active: item.active,
      stock: item.stocks[0]?.available ?? 0,
      image: item.images[0]?.path || '/images/placeholder-food.svg',
      imageCredit: item.images[0] ? {
        sourcePageUrl: item.images[0].sourcePageUrl,
        author: item.images[0].author,
        licenseType: item.images[0].licenseType,
      } : null,
    }));
  }

  categories() { return this.prisma.category.findMany({orderBy: {name: 'asc'}}); }

  slots() {
    return this.prisma.pickupSlot.findMany({where: {active: true, startsAt: {gte: new Date()}}, orderBy: {startsAt: 'asc'}, take: 30});
  }

  async create(dto: CreateMenuItemDto, actorId: string) {
    const slug = slugify(dto.name);
    return this.prisma.$transaction(async tx => {
      const item = await tx.menuItem.create({data: {
        name: dto.name.trim(), slug, description: dto.description.trim(), price: dto.price,
        prepMinutes: dto.prepMinutes, vegetarian: dto.vegetarian, spicyLevel: dto.spicyLevel,
        categoryId: dto.categoryId,
        images: {create: {path: dto.imagePath, altText: dto.altText, sourcePageUrl: dto.sourcePageUrl, author: dto.author, licenseType: dto.licenseType, attributionText: dto.attributionText, isPrimary: true}},
      }, include: {category: true, images: true}});
      await tx.auditLog.create({data: {userId: actorId, action: 'MENU_ITEM_CREATED', entityType: 'MenuItem', entityId: item.id}});
      return item;
    });
  }

  async setStock(menuItemId: string, dto: SetStockDto, actorId: string) {
    const date = day(dto.date);
    const current = await this.prisma.dailyItemStock.findUnique({where: {date_menuItemId: {date, menuItemId}}});
    if (current && dto.available < 0) throw new BadRequestException('Tồn kho không hợp lệ.');
    const stock = await this.prisma.dailyItemStock.upsert({
      where: {date_menuItemId: {date, menuItemId}},
      create: {date, menuItemId, available: dto.available},
      update: {available: dto.available},
    });
    await this.prisma.auditLog.create({data: {userId: actorId, action: 'DAILY_STOCK_SET', entityType: 'DailyItemStock', entityId: stock.id, metadata: {available: dto.available}}});
    return stock;
  }
}

export function day(input?: string | Date) {
  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) throw new BadRequestException('Ngày không hợp lệ.');
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
