import {
  AttendanceStatus, DiningType, DiscountType, EmployeeStatus, InventoryTransactionType,
  KitchenTaskStatus, LoyaltyTransactionType, NotificationType, OrderStatus, PaymentMethod,
  PaymentStatus, PickupType, PrismaClient, Role, ShiftStatus, StockReceiptStatus,
  StudentDirectoryStatus, StudentVoucherStatus, UserStatus, WalletRequestStatus,
  WalletRequestType, WalletTransactionType,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const password = process.env.SEED_DEMO_PASSWORD ?? 'CanteenVWA@2026';
const referenceNow = new Date('2026-09-28T05:00:00.000Z');

type ProductSeed = { name: string; slug: string; category: string; price: number; prep: number; calories: number; vegetarian?: boolean; description: string };

const categorySeeds = [
  ['Cơm', 'com', '🍚'], ['Phở & Bún', 'pho-bun', '🍜'], ['Mì & Bánh mì', 'mi-banh-mi', '🥖'],
  ['Ăn vặt', 'an-vat', '🥟'], ['Đồ uống', 'do-uong', '🥤'], ['Món chay', 'mon-chay', '🌱'],
] as const;

const productSeeds: ProductSeed[] = [
  { name: 'Cơm gà xối mỡ', slug: 'com-ga-xoi-mo', category: 'Cơm', price: 38000, prep: 14, calories: 690, description: 'Cơm nóng, đùi gà da giòn, dưa leo và nước mắm tỏi ớt.' },
  { name: 'Cơm sườn nướng', slug: 'com-suon-nuong', category: 'Cơm', price: 42000, prep: 15, calories: 720, description: 'Sườn heo nướng mật ong, cơm trắng, đồ chua và mỡ hành.' },
  { name: 'Cơm thịt kho trứng', slug: 'com-thit-kho-trung', category: 'Cơm', price: 35000, prep: 8, calories: 650, description: 'Thịt kho mềm, trứng kho đậm vị và rau luộc theo ngày.' },
  { name: 'Cơm chay nấm', slug: 'com-chay-nam', category: 'Món chay', price: 32000, prep: 10, calories: 480, vegetarian: true, description: 'Nấm xào rau củ, đậu hũ áp chảo và cơm trắng.' },
  { name: 'Phở bò tái', slug: 'pho-bo-tai', category: 'Phở & Bún', price: 40000, prep: 12, calories: 510, description: 'Bánh phở mềm, bò tái và nước dùng ninh xương thơm quế hồi.' },
  { name: 'Bún chả Hà Nội', slug: 'bun-cha-ha-noi', category: 'Phở & Bún', price: 40000, prep: 15, calories: 570, description: 'Chả viên, thịt nướng, bún tươi, rau sống và nước chấm chua ngọt.' },
  { name: 'Bún bò Huế', slug: 'bun-bo-hue', category: 'Phở & Bún', price: 40000, prep: 13, calories: 560, description: 'Nước dùng sả cay nhẹ, thịt bò, chả Huế và rau thơm.' },
  { name: 'Mì xào bò', slug: 'mi-xao-bo', category: 'Mì & Bánh mì', price: 38000, prep: 12, calories: 610, description: 'Mì xào lửa lớn cùng thịt bò mềm và rau cải giòn.' },
  { name: 'Bánh mì thịt nướng', slug: 'banh-mi-thit-nuong', category: 'Mì & Bánh mì', price: 25000, prep: 6, calories: 430, description: 'Bánh mì giòn kẹp thịt nướng, đồ chua, dưa leo và rau mùi.' },
  { name: 'Bánh mì trứng', slug: 'banh-mi-trung', category: 'Mì & Bánh mì', price: 20000, prep: 5, calories: 390, vegetarian: true, description: 'Hai trứng ốp la, pa-tê chay, dưa leo và sốt bơ trứng.' },
  { name: 'Gỏi cuốn tôm thịt', slug: 'goi-cuon-tom-thit', category: 'Ăn vặt', price: 25000, prep: 6, calories: 260, description: 'Ba cuốn tôm thịt tươi, bún, rau xanh và sốt tương đậu.' },
  { name: 'Nem chua rán', slug: 'nem-chua-ran', category: 'Ăn vặt', price: 30000, prep: 8, calories: 420, description: 'Nem rán giòn nóng, ăn kèm dưa leo và tương ớt.' },
  { name: 'Khoai tây chiên', slug: 'khoai-tay-chien', category: 'Ăn vặt', price: 25000, prep: 7, calories: 360, vegetarian: true, description: 'Khoai tây chiên vàng giòn, lựa chọn vị muối hoặc phô mai.' },
  { name: 'Bánh bao xá xíu', slug: 'banh-bao-xa-xiu', category: 'Ăn vặt', price: 22000, prep: 4, calories: 330, description: 'Bánh bao nóng mềm với nhân xá xíu mặn ngọt.' },
  { name: 'Trà chanh', slug: 'tra-chanh', category: 'Đồ uống', price: 12000, prep: 3, calories: 90, vegetarian: true, description: 'Trà đen, chanh tươi và đường, pha mới theo từng ly.' },
  { name: 'Trà đào cam sả', slug: 'tra-dao-cam-sa', category: 'Đồ uống', price: 20000, prep: 4, calories: 140, vegetarian: true, description: 'Trà đào thơm, lát cam tươi và sả.' },
  { name: 'Cà phê sữa đá', slug: 'ca-phe-sua-da', category: 'Đồ uống', price: 18000, prep: 4, calories: 160, vegetarian: true, description: 'Cà phê rang đậm pha phin cùng sữa đặc và đá.' },
  { name: 'Sữa đậu nành', slug: 'sua-dau-nanh', category: 'Đồ uống', price: 12000, prep: 2, calories: 110, vegetarian: true, description: 'Sữa đậu nành thanh nhẹ, phục vụ nóng hoặc lạnh.' },
  { name: 'Nước cam', slug: 'nuoc-cam', category: 'Đồ uống', price: 20000, prep: 4, calories: 120, vegetarian: true, description: 'Cam tươi vắt tại quầy, tùy chọn ít đường.' },
  { name: 'Nước suối', slug: 'nuoc-suoi', category: 'Đồ uống', price: 8000, prep: 1, calories: 0, vegetarian: true, description: 'Nước tinh khiết đóng chai 500 ml.' },
];

const menuImageUrls = [
  'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1550507992-eb63ffee0847?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=82&sat=-10',
  'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=1200&q=82',
] as const;

const ingredientSeeds = [
  ['Gạo tẻ', 'kg', 180, 15, 18000], ['Thịt gà', 'kg', 75, 10, 78000], ['Sườn heo', 'kg', 65, 8, 115000],
  ['Thịt ba chỉ', 'kg', 55, 8, 105000], ['Thịt bò', 'kg', 60, 8, 175000], ['Trứng gà', 'quả', 420, 60, 3200],
  ['Bánh phở', 'kg', 80, 12, 24000], ['Bún tươi', 'kg', 95, 12, 22000], ['Mì sợi', 'kg', 55, 8, 30000],
  ['Bánh mì', 'ổ', 260, 40, 4500], ['Tôm', 'kg', 32, 5, 165000], ['Đậu hũ', 'miếng', 180, 25, 4500],
  ['Nấm', 'kg', 35, 5, 85000], ['Khoai tây', 'kg', 70, 10, 32000], ['Rau xanh', 'kg', 90, 12, 28000],
  ['Dưa leo', 'kg', 45, 6, 22000], ['Cà rốt', 'kg', 40, 6, 24000], ['Dầu ăn', 'lít', 75, 10, 39000],
  ['Nước dùng', 'lít', 150, 20, 18000], ['Trà', 'kg', 18, 3, 115000], ['Cà phê', 'kg', 20, 3, 175000],
  ['Sữa đặc', 'lon', 90, 12, 25000], ['Cam tươi', 'kg', 55, 8, 42000], ['Nước suối chai', 'chai', 360, 50, 4500],
] as const;

const familyNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Dương', 'Mai'];
const middleNames = ['Thị Minh', 'Ngọc', 'Thu', 'Quỳnh', 'Thanh', 'Hải', 'Phương', 'Khánh', 'Mai', 'Hoài', 'Bảo', 'Gia'];
const givenNames = ['Anh', 'An', 'Chi', 'Dương', 'Giang', 'Hà', 'Hương', 'Lan', 'Linh', 'Mai', 'My', 'Ngân', 'Phương', 'Quỳnh', 'Thảo', 'Trang', 'Uyên', 'Yến', 'Nam', 'Minh'];
const majors = [
  { code: '324', faculty: 'Viện Công nghệ Thông tin', major: 'Truyền thông đa phương tiện', classCode: 'TTDPT' },
  { code: '341', faculty: 'Khoa Quản trị kinh doanh', major: 'Quản trị kinh doanh', classCode: 'QTKD' },
  { code: '343', faculty: 'Khoa Quản trị kinh doanh', major: 'Quản trị dịch vụ du lịch và lữ hành', classCode: 'QTDL' },
  { code: '381', faculty: 'Khoa Luật', major: 'Luật', classCode: 'LUAT' },
  { code: '761', faculty: 'Khoa Công tác xã hội', major: 'Công tác xã hội', classCode: 'CTXH' },
] as const;

function daysBefore(days: number, hour = 4, minute = 0) {
  const date = new Date(referenceNow);
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

async function resetDatabase() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (!tables.length) return;
  const names = tables.map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}

async function seedIdentity(passwordHash: string) {
  const adminUser = await prisma.user.create({ data: { email: 'admin@canteen.hpn.edu.vn', passwordHash, role: Role.ADMIN, status: UserStatus.ACTIVE } });
  const admin = await prisma.employeeProfile.create({ data: { userId: adminUser.id, employeeCode: 'VWA-ADM-001', fullName: 'Nguyễn Thu Hà', phone: '0904100001', workRole: Role.ADMIN, status: EmployeeStatus.ACTIVE, hireDate: new Date('2023-08-01') } });
  const employees = [];
  const staff = [
    { email: 'thungan01@canteen.hpn.edu.vn', code: 'VWA-TN-001', name: 'Trần Minh Anh', phone: '0904200001', role: Role.CASHIER },
    { email: 'thungan02@canteen.hpn.edu.vn', code: 'VWA-TN-002', name: 'Lê Thu Trang', phone: '0904200002', role: Role.CASHIER },
    { email: 'bep01@canteen.hpn.edu.vn', code: 'VWA-BEP-001', name: 'Phạm Văn Hùng', phone: '0904300001', role: Role.KITCHEN_STAFF },
    { email: 'bep02@canteen.hpn.edu.vn', code: 'VWA-BEP-002', name: 'Đỗ Ngọc Mai', phone: '0904300002', role: Role.KITCHEN_STAFF },
  ];
  for (const [index, member] of staff.entries()) {
    const user = await prisma.user.create({ data: { email: member.email, passwordHash, role: member.role, status: UserStatus.ACTIVE } });
    employees.push(await prisma.employeeProfile.create({ data: { userId: user.id, employeeCode: member.code, fullName: member.name, phone: member.phone, workRole: member.role, status: EmployeeStatus.ACTIVE, hireDate: new Date(Date.UTC(2024 + index % 2, index * 2, 3)) } }));
  }
  const studentProfiles = [];
  for (let index = 0; index < 100; index++) {
    const year = 2023 + index % 4;
    const major = majors[index % majors.length];
    const studentCode = `${String(year).slice(-2)}7${major.code}${String(index + 1).padStart(4, '0')}`;
    const fullName = `${familyNames[index % familyNames.length]} ${middleNames[index * 3 % middleNames.length]} ${givenNames[index * 7 % givenNames.length]}`;
    const directory = await prisma.studentDirectory.create({ data: { studentCode, schoolEmail: `${studentCode}@hpn.edu.vn`, fullName, faculty: major.faculty, major: major.major, className: `K${year - 2012}${major.classCode}${index % 2 === 0 ? 'A' : 'B'}`, academicYear: `${year}-${year + 4}`, status: StudentDirectoryStatus.ACTIVE } });
    if (index >= 50) continue;
    const user = await prisma.user.create({ data: { email: directory.schoolEmail, passwordHash, role: Role.STUDENT, status: UserStatus.ACTIVE, avatarUrl: '/images/default-student-avatar.svg' } });
    const startingBalance = 50000 + index % 6 * 50000;
    const startingPoints = 40 + index % 9 * 35;
    studentProfiles.push(await prisma.studentProfile.create({
      data: { userId: user.id, studentDirectoryId: directory.id,
        wallet: { create: { balance: startingBalance, bankName: index % 3 === 0 ? 'Vietcombank' : null, bankAccountNumber: index % 3 === 0 ? `001100${100000 + index}` : null, bankAccountName: index % 3 === 0 ? fullName.toUpperCase() : null, bankLinkedAt: index % 3 === 0 ? daysBefore(120 - index) : null } },
        loyaltyAccount: { create: { points: startingPoints } }, cart: { create: {} } },
      include: { user: true, wallet: true, loyaltyAccount: true },
    }));
  }
  return { adminUser, admin, employees, studentProfiles };
}

async function seedCatalog() {
  const categoryByName = new Map<string, string>();
  for (const [index, [name, slug, icon]] of categorySeeds.entries()) {
    const category = await prisma.category.create({ data: { name, slug, icon, sortOrder: index + 1 } });
    categoryByName.set(name, category.id);
  }
  const products = [];
  for (const [index, seed] of productSeeds.entries()) {
    products.push(await prisma.product.create({ data: { categoryId: categoryByName.get(seed.category)!, name: seed.name, slug: seed.slug, description: seed.description, basePrice: seed.price, preparationTimeMinutes: seed.prep, calories: seed.calories, isVegetarian: seed.vegetarian ?? false, imageUrl: menuImageUrls[index], isAvailable: true } }));
  }
  for (const product of products.filter(item => ['tra-chanh', 'tra-dao-cam-sa', 'ca-phe-sua-da', 'sua-dau-nanh', 'nuoc-cam'].includes(item.slug))) {
    await prisma.productVariant.createMany({ data: [
      { productId: product.id, name: 'M', sku: `${product.slug.toUpperCase()}-M`, priceAdjustment: 0 },
      { productId: product.id, name: 'L', sku: `${product.slug.toUpperCase()}-L`, priceAdjustment: 5000 },
    ] });
  }
  const sugar = await prisma.productOptionGroup.create({ data: { name: 'Mức đường', slug: 'muc-duong', minSelect: 1, maxSelect: 1, isRequired: true } });
  const ice = await prisma.productOptionGroup.create({ data: { name: 'Lượng đá', slug: 'luong-da', minSelect: 1, maxSelect: 1, isRequired: true } });
  await prisma.productOptionValue.createMany({ data: [
    ...['0%', '30%', '50%', '70%', '100%'].map((name, sortOrder) => ({ optionGroupId: sugar.id, name, sortOrder })),
    ...['Không đá', 'Ít đá', 'Bình thường'].map((name, sortOrder) => ({ optionGroupId: ice.id, name, sortOrder })),
  ] });
  const drinks = products.filter(item => productSeeds.find(seed => seed.slug === item.slug)?.category === 'Đồ uống' && item.slug !== 'nuoc-suoi');
  await prisma.productOptionGroupLink.createMany({ data: drinks.flatMap(product => [{ productId: product.id, optionGroupId: sugar.id, sortOrder: 0 }, { productId: product.id, optionGroupId: ice.id, sortOrder: 1 }]) });
  const comboSeeds = [
    ['Combo no bụng', 'combo-no-bung', [0, 14]], ['Combo sườn sinh viên', 'combo-suon-sinh-vien', [1, 19]],
    ['Combo phở sáng', 'combo-pho-sang', [4, 16]], ['Combo bánh mì cà phê', 'combo-banh-mi-ca-phe', [8, 16]],
    ['Combo ăn vặt nhóm bạn', 'combo-an-vat-nhom-ban', [10, 11, 12, 15]],
  ] as const;
  for (const [name, slug, indexes] of comboSeeds) {
    const originalPrice = indexes.reduce((sum, index) => sum + products[index].basePrice, 0);
    await prisma.combo.create({ data: { name, slug, description: 'Combo tiết kiệm dành cho sinh viên Học viện Phụ nữ Việt Nam.', imageUrl: products[indexes[0]].imageUrl, originalPrice, calculatedPrice: Math.round(originalPrice * 0.88 / 1000) * 1000, discountPercentage: 12, items: { create: indexes.map(index => ({ productId: products[index].id })) } } });
  }
  return products;
}

async function seedInventory(products: Awaited<ReturnType<typeof seedCatalog>>, adminEmployeeId: string) {
  const ingredients = [];
  for (const [name, unit, quantity, threshold, cost] of ingredientSeeds) {
    ingredients.push(await prisma.ingredient.create({ data: { name, unit, currentQuantity: quantity, lowStockThreshold: threshold, reorderThreshold: threshold * 2, costPerUnit: cost } }));
  }
  for (const [index, product] of products.entries()) {
    const recipe = await prisma.recipe.create({ data: { productId: product.id, name: `Công thức ${product.name}` } });
    const usedIngredients = index >= 14 ? [ingredients[19 + index % 5]] : [ingredients[index % 18], ingredients[(index + 5) % 18], ingredients[(index + 10) % 18]];
    await prisma.recipeIngredient.createMany({ data: usedIngredients.map((ingredient, ingredientIndex) => ({ recipeId: recipe.id, ingredientId: ingredient.id, quantity: index >= 14 ? (index === 19 ? 1 : 0.03) : 0.12 + ingredientIndex * 0.03 })) });
  }
  const suppliers = [];
  for (const supplier of [
    ['Thực phẩm sạch Hà Nội', 'Nguyễn Văn Hòa', '02437650001', 'Nhổn, Bắc Từ Liêm, Hà Nội'],
    ['Rau củ Hòa Bình', 'Bùi Thị Sen', '02437650002', 'Lương Sơn, Hòa Bình'],
    ['Đồ uống An Việt', 'Trần Quốc Minh', '02437650003', 'Cầu Giấy, Hà Nội'],
    ['Bếp Việt Food', 'Lê Thanh Hải', '02437650004', 'Long Biên, Hà Nội'],
  ]) {
    suppliers.push(await prisma.supplier.create({ data: { name: supplier[0], contactName: supplier[1], phone: supplier[2], email: `ncc${suppliers.length + 1}@canteen.local`, address: supplier[3] } }));
  }
  for (let receiptIndex = 0; receiptIndex < 3; receiptIndex++) {
    const selected = ingredients.slice(receiptIndex * 8, receiptIndex * 8 + 8);
    const totalCost = selected.reduce((sum, item) => sum + item.costPerUnit * 20, 0);
    const receipt = await prisma.stockReceipt.create({ data: { receiptCode: `PN-202609-${String(receiptIndex + 1).padStart(3, '0')}`, supplierId: suppliers[receiptIndex].id, employeeId: adminEmployeeId, receivedAt: daysBefore(24 - receiptIndex * 8, 1), confirmedAt: daysBefore(24 - receiptIndex * 8, 2), totalCost, status: StockReceiptStatus.CONFIRMED } });
    for (const ingredient of selected) {
      await prisma.stockReceiptItem.create({ data: { stockReceiptId: receipt.id, ingredientId: ingredient.id, quantity: 20, unitCost: ingredient.costPerUnit, lineTotal: ingredient.costPerUnit * 20 } });
      await prisma.inventoryTransaction.create({ data: { ingredientId: ingredient.id, type: InventoryTransactionType.STOCK_IN, quantity: 20, quantityBefore: Number(ingredient.currentQuantity) - 20, quantityAfter: ingredient.currentQuantity, reservedBefore: 0, reservedAfter: 0, referenceType: 'STOCK_RECEIPT', referenceId: receipt.id, note: 'Nhập kho dữ liệu mẫu', createdAt: receipt.receivedAt } });
    }
  }
}

async function seedPromotions() {
  const startAt = new Date('2026-01-01T00:00:00.000Z');
  const expireAt = new Date('2027-12-31T23:59:59.000Z');
  const coupons = [];
  for (const seed of [
    ['TANSINHVIEN', 'Chào tân sinh viên', DiscountType.PERCENTAGE, 15, 30000, 15000, false],
    ['TRUAVUI10', 'Bữa trưa vui vẻ', DiscountType.PERCENTAGE, 10, 40000, 12000, false],
    ['COMBO5K', 'Combo tiết kiệm', DiscountType.FIXED_AMOUNT, 5000, 45000, null, true],
    ['THUHAI8K', 'Thứ Hai năng lượng', DiscountType.FIXED_AMOUNT, 8000, 50000, null, false],
    ['NUOCFREE', 'Ưu đãi đồ uống', DiscountType.FIXED_AMOUNT, 10000, 65000, 10000, false],
  ] as const) {
    coupons.push(await prisma.coupon.create({ data: { code: seed[0], name: seed[1], description: `${seed[1]} tại Canteen VWA`, type: seed[2], discountValue: seed[3], minimumOrderValue: seed[4], maximumDiscount: seed[5], requiresCombo: seed[6], usageLimit: 500, perStudentLimit: 5, startAt, expireAt } }));
  }
  const vouchers = [];
  for (const seed of [
    ['VWA5K', 'Voucher 5.000đ', 50, 5000, 20000], ['VWA10K', 'Voucher 10.000đ', 100, 10000, 40000],
    ['VWA20K', 'Voucher 20.000đ', 180, 20000, 70000], ['VWA30K', 'Voucher 30.000đ', 250, 30000, 100000],
  ] as const) {
    vouchers.push(await prisma.voucher.create({ data: { code: seed[0], name: seed[1], description: `Đổi ${seed[2]} điểm để nhận ${seed[1]}`, discountType: DiscountType.FIXED_AMOUNT, discountValue: seed[3], requiredPoints: seed[2], totalQuantity: 300, remainingQuantity: 250, minimumOrderValue: seed[4], startAt, expireAt, perStudentLimit: 3 } }));
  }
  return { coupons, vouchers };
}

async function seedStudentBenefits(profiles: Awaited<ReturnType<typeof seedIdentity>>['studentProfiles'], products: Awaited<ReturnType<typeof seedCatalog>>, vouchers: Awaited<ReturnType<typeof seedPromotions>>['vouchers']) {
  for (const [index, profile] of profiles.entries()) {
    await prisma.walletTransaction.create({ data: { walletId: profile.wallet!.id, type: WalletTransactionType.TOP_UP, amount: profile.wallet!.balance, balanceBefore: 0, balanceAfter: profile.wallet!.balance, description: 'Nạp số dư đầu kỳ', reference: `VWA-TOPUP-${String(index + 1).padStart(3, '0')}`, createdAt: daysBefore(150 - index) } });
    await prisma.loyaltyTransaction.create({ data: { loyaltyAccountId: profile.loyaltyAccount!.id, type: LoyaltyTransactionType.EARN, points: profile.loyaltyAccount!.points, balanceBefore: 0, balanceAfter: profile.loyaltyAccount!.points, description: 'Điểm tích lũy đầu kỳ', reference: `VWA-POINT-${String(index + 1).padStart(3, '0')}`, createdAt: daysBefore(145 - index) } });
    await prisma.favorite.createMany({ data: [0, 1, 2].map(offset => ({ studentProfileId: profile.id, productId: products[(index * 3 + offset * 5) % products.length].id })) });
    if (index % 2 === 0) {
      await prisma.studentVoucher.create({ data: { studentProfileId: profile.id, voucherId: vouchers[index % vouchers.length].id, serialCode: `VWA-SV-${String(index + 1).padStart(4, '0')}`, status: index % 6 === 0 ? StudentVoucherStatus.USED : StudentVoucherStatus.ACTIVE, redeemedAt: daysBefore(60 - index % 30), usedAt: index % 6 === 0 ? daysBefore(20 - index % 10) : null } });
    }
    if (index < 8) {
      await prisma.walletRequest.create({ data: { requestCode: `YC-${String(index + 1).padStart(4, '0')}`, walletId: profile.wallet!.id, type: index % 4 === 0 ? WalletRequestType.WITHDRAWAL : WalletRequestType.DEPOSIT, amount: 50000 + index % 3 * 50000, method: 'Chuyển khoản ngân hàng', status: index < 5 ? WalletRequestStatus.APPROVED : index < 7 ? WalletRequestStatus.PENDING : WalletRequestStatus.REJECTED, note: 'Yêu cầu ví dữ liệu mẫu', createdAt: daysBefore(12 - index), reviewedAt: index < 5 || index === 7 ? daysBefore(11 - index) : null } });
    }
  }
}

async function seedWorkforce(employees: Awaited<ReturnType<typeof seedIdentity>>['employees']) {
  for (const [employeeIndex, employee] of employees.entries()) {
    for (let dayOffset = 10; dayOffset >= -5; dayOffset--) {
      const date = daysBefore(dayOffset, 0);
      const completed = dayOffset > 0;
      const shift = await prisma.shift.create({ data: { employeeId: employee.id, date, startTime: employeeIndex % 2 === 0 ? '07:00' : '10:00', endTime: employeeIndex % 2 === 0 ? '15:00' : '18:00', workRole: employee.workRole, status: completed ? ShiftStatus.COMPLETED : ShiftStatus.SCHEDULED } });
      if (completed) {
        const late = (employeeIndex + dayOffset) % 5 === 0;
        const absent = (employeeIndex + dayOffset) % 13 === 0;
        await prisma.attendance.create({ data: { employeeId: employee.id, shiftId: shift.id, scheduledStart: new Date(date.getTime() + (employeeIndex % 2 === 0 ? 0 : 3) * 3_600_000), scheduledEnd: new Date(date.getTime() + (employeeIndex % 2 === 0 ? 8 : 11) * 3_600_000), clockInAt: absent ? null : new Date(date.getTime() + (employeeIndex % 2 === 0 ? 0 : 3) * 3_600_000 + (late ? 12 : 0) * 60_000), clockOutAt: absent ? null : new Date(date.getTime() + (employeeIndex % 2 === 0 ? 8 : 11) * 3_600_000), status: absent ? AttendanceStatus.ABSENT : late ? AttendanceStatus.LATE : AttendanceStatus.PRESENT } });
      }
    }
  }
}

function statusForOrder(index: number): OrderStatus {
  if (index >= 188) return [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY][index % 4];
  return [OrderStatus.COMPLETED, OrderStatus.COMPLETED, OrderStatus.COMPLETED, OrderStatus.COMPLETED, OrderStatus.REJECTED, OrderStatus.CANCELLED][index % 6];
}

async function seedOrders(
  products: Awaited<ReturnType<typeof seedCatalog>>,
  profiles: Awaited<ReturnType<typeof seedIdentity>>['studentProfiles'],
  employees: Awaited<ReturnType<typeof seedIdentity>>['employees'],
  coupons: Awaited<ReturnType<typeof seedPromotions>>['coupons'],
) {
  const kitchenEmployees = employees.filter(employee => employee.workRole === Role.KITCHEN_STAFF);
  const cashiers = employees.filter(employee => employee.workRole === Role.CASHIER);
  const dailyCounts = new Map<string, number>();
  for (let index = 0; index < 200; index++) {
    const daysAgo = Math.floor((199 - index) * 240 / 199);
    const createdAt = daysBefore(daysAgo, 2 + index % 7, index * 11 % 60);
    const dateKey = createdAt.toISOString().slice(0, 10);
    const daySequence = (dailyCounts.get(dateKey) ?? 0) + 1;
    dailyCounts.set(dateKey, daySequence);
    const status = statusForOrder(index);
    const profile = profiles[index * 7 % profiles.length];
    const itemCount = 1 + index % 3;
    const selectedProducts = Array.from({ length: itemCount }, (_, itemIndex) => products[(index * 5 + itemIndex * 7) % products.length]);
    const quantities = selectedProducts.map((_, itemIndex) => 1 + ((index + itemIndex) % 7 === 0 ? 1 : 0));
    const subtotal = selectedProducts.reduce((sum, product, itemIndex) => sum + product.basePrice * quantities[itemIndex], 0);
    const coupon = index % 8 === 0 ? coupons[index % coupons.length] : null;
    const rawDiscount = coupon ? (coupon.type === DiscountType.PERCENTAGE ? Math.round(subtotal * coupon.discountValue / 100) : coupon.discountValue) : 0;
    const couponDiscount = coupon ? Math.min(rawDiscount, coupon.maximumDiscount ?? rawDiscount) : 0;
    const pointDiscount = index % 17 === 0 ? Math.min(5000, subtotal - couponDiscount) : 0;
    const totalAmount = Math.max(0, subtotal - couponDiscount - pointDiscount);
    const paymentMethod = [PaymentMethod.CASH, PaymentMethod.VNPAY_QR_MOCK, PaymentMethod.CANTEEN_WALLET][index % 3];
    const isCancelled = status === OrderStatus.CANCELLED;
    const isRejected = status === OrderStatus.REJECTED;
    const isPaid = !isRejected && status !== OrderStatus.PENDING;
    const paymentStatus = isCancelled && index % 2 === 0 ? PaymentStatus.REFUNDED : isPaid ? PaymentStatus.PAID : isRejected ? PaymentStatus.FAILED : PaymentStatus.PENDING;
    const acceptedAt = [OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(status) ? new Date(createdAt.getTime() + 4 * 60_000) : null;
    const readyAt = [OrderStatus.READY, OrderStatus.COMPLETED].includes(status) ? new Date(createdAt.getTime() + 18 * 60_000) : null;
    const completedAt = status === OrderStatus.COMPLETED ? new Date(createdAt.getTime() + 24 * 60_000) : null;
    const cancelledAt = isCancelled ? new Date(createdAt.getTime() + 7 * 60_000) : null;
    const orderCode = `VWA-${dateKey.replaceAll('-', '')}-${String(daySequence).padStart(3, '0')}`;
    const history = [
      { oldStatus: null, newStatus: OrderStatus.PENDING, createdAt },
      ...([OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED].includes(status) ? [{ oldStatus: OrderStatus.PENDING, newStatus: OrderStatus.ACCEPTED, changedByUserId: cashiers[index % cashiers.length].userId, createdAt: new Date(createdAt.getTime() + 4 * 60_000) }] : []),
      ...([OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED].includes(status) ? [{ oldStatus: OrderStatus.ACCEPTED, newStatus: OrderStatus.PREPARING, createdAt: new Date(createdAt.getTime() + 7 * 60_000) }] : []),
      ...([OrderStatus.READY, OrderStatus.COMPLETED].includes(status) ? [{ oldStatus: OrderStatus.PREPARING, newStatus: OrderStatus.READY, createdAt: new Date(createdAt.getTime() + 18 * 60_000) }] : []),
      ...(status === OrderStatus.COMPLETED ? [{ oldStatus: OrderStatus.READY, newStatus: OrderStatus.COMPLETED, changedByUserId: cashiers[index % cashiers.length].userId, createdAt: completedAt! }] : []),
      ...(isRejected ? [{ oldStatus: OrderStatus.PENDING, newStatus: OrderStatus.REJECTED, changedByUserId: cashiers[index % cashiers.length].userId, note: 'Món tạm hết', createdAt: new Date(createdAt.getTime() + 3 * 60_000) }] : []),
      ...(isCancelled ? [{ oldStatus: OrderStatus.ACCEPTED, newStatus: OrderStatus.CANCELLED, note: 'Sinh viên hủy đơn', createdAt: cancelledAt! }] : []),
    ];
    const order = await prisma.order.create({
      data: {
        orderCode, idempotencyKey: `vwa-seed-order-${String(index + 1).padStart(4, '0')}`, studentProfileId: profile.id,
        diningType: index % 3 === 0 ? DiningType.TAKEAWAY : DiningType.DINE_IN,
        pickupType: index % 5 === 0 ? PickupType.SCHEDULED : PickupType.ASAP,
        scheduledPickupAt: index % 5 === 0 ? new Date(createdAt.getTime() + 35 * 60_000) : null,
        subtotal, couponDiscount, pointDiscount, pointsUsed: pointDiscount / 100, discountTotal: couponDiscount + pointDiscount, totalAmount,
        status, paymentStatus, paymentMethod, couponId: coupon?.id,
        note: index % 11 === 0 ? 'Ít cay, không lấy thìa nhựa.' : index % 13 === 0 ? 'Nhận món tại quầy số 2.' : null,
        cancellationReason: isCancelled ? (index % 2 === 0 ? 'Sinh viên đổi lịch học' : 'Đặt nhầm món') : isRejected ? 'Món chính tạm hết nguyên liệu' : null,
        createdAt, acceptedAt, readyAt, completedAt, cancelledAt,
        items: { create: selectedProducts.map((product, itemIndex) => ({
          productId: product.id, quantity: quantities[itemIndex], productNameSnapshot: product.name, unitPriceSnapshot: product.basePrice,
          lineSubtotal: product.basePrice * quantities[itemIndex], note: itemIndex === 0 && index % 9 === 0 ? 'Không hành' : null,
          requiresKitchen: product.preparationTimeMinutes > 2,
          kitchenTask: product.preparationTimeMinutes > 2 ? { create: {
            employeeId: [OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED].includes(status) ? kitchenEmployees[index % kitchenEmployees.length].id : null,
            status: status === OrderStatus.COMPLETED || status === OrderStatus.READY ? KitchenTaskStatus.DONE : status === OrderStatus.PREPARING ? KitchenTaskStatus.PREPARING : status === OrderStatus.ACCEPTED ? KitchenTaskStatus.CLAIMED : KitchenTaskStatus.WAITING,
            claimedAt: acceptedAt, startedAt: [OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED].includes(status) ? new Date(createdAt.getTime() + 7 * 60_000) : null,
            completedAt: [OrderStatus.READY, OrderStatus.COMPLETED].includes(status) ? new Date(createdAt.getTime() + (15 + itemIndex) * 60_000) : null,
          } } : undefined,
        })) },
        statusHistory: { create: history },
        payments: { create: { method: paymentMethod, status: paymentStatus, amount: totalAmount, idempotencyKey: `vwa-seed-payment-${String(index + 1).padStart(4, '0')}`, providerRef: `VWA-PAY-${String(index + 1).padStart(6, '0')}`, paidAt: isPaid ? new Date(createdAt.getTime() + 2 * 60_000) : null, failedAt: isRejected ? new Date(createdAt.getTime() + 3 * 60_000) : null, metadata: { seed: true, channel: paymentMethod }, createdAt } },
      }, include: { items: true },
    });
    if (coupon) await prisma.couponUsage.create({ data: { couponId: coupon.id, studentProfileId: profile.id, orderId: order.id, discountAmount: couponDiscount, createdAt } });
    if (paymentMethod === PaymentMethod.CANTEEN_WALLET && isPaid) {
      await prisma.walletTransaction.create({ data: { walletId: profile.wallet!.id, orderId: order.id, type: WalletTransactionType.PAYMENT, amount: -totalAmount, balanceBefore: profile.wallet!.balance + totalAmount, balanceAfter: profile.wallet!.balance, description: `Thanh toán đơn ${orderCode}`, reference: `VWA-WALLET-ORDER-${index + 1}`, createdAt } });
    }
    if (status === OrderStatus.COMPLETED) {
      const earned = Math.max(1, Math.floor(totalAmount / 10000));
      await prisma.loyaltyTransaction.create({ data: { loyaltyAccountId: profile.loyaltyAccount!.id, orderId: order.id, type: LoyaltyTransactionType.EARN, points: earned, balanceBefore: Math.max(0, profile.loyaltyAccount!.points - earned), balanceAfter: profile.loyaltyAccount!.points, description: `Tích điểm đơn ${orderCode}`, reference: `VWA-LOYALTY-ORDER-${index + 1}`, createdAt: completedAt! } });
    }
    if (index % 10 === 0) {
      const room = await prisma.chatRoom.create({ data: { orderId: order.id, createdAt } });
      const cashier = cashiers[index % cashiers.length];
      await prisma.chatParticipant.createMany({ data: [{ roomId: room.id, userId: profile.userId }, { roomId: room.id, userId: cashier.userId }] });
      await prisma.chatMessage.createMany({ data: [
        { roomId: room.id, senderUserId: profile.userId, senderRole: Role.STUDENT, content: 'Cho mình xin ít nước chấm nhé ạ.', createdAt: new Date(createdAt.getTime() + 60_000) },
        { roomId: room.id, senderUserId: cashier.userId, senderRole: Role.CASHIER, content: 'Căng tin đã ghi chú cho đơn của bạn.', readAt: new Date(createdAt.getTime() + 3 * 60_000), createdAt: new Date(createdAt.getTime() + 2 * 60_000) },
      ] });
    }
  }
  for (const [dateKey, count] of dailyCounts) await prisma.orderDailyCounter.create({ data: { date: new Date(`${dateKey}T00:00:00.000Z`), value: count } });
  const reviewableItems = await prisma.orderItem.findMany({ where: { order: { status: OrderStatus.COMPLETED }, productId: { not: null } }, include: { order: true }, take: 90, orderBy: { createdAt: 'desc' } });
  const comments = ['Món vừa miệng, phục vụ nhanh.', 'Phần ăn đầy đặn và còn nóng.', 'Giá phù hợp sinh viên.', 'Đóng gói sạch sẽ, sẽ đặt lại.', 'Đồ ăn ổn, mong căng tin giảm cay một chút.'];
  for (const [index, item] of reviewableItems.entries()) {
    await prisma.review.create({ data: { studentProfileId: item.order.studentProfileId, productId: item.productId!, orderItemId: item.id, rating: index % 11 === 0 ? 3 : index % 4 === 0 ? 4 : 5, comment: comments[index % comments.length], createdAt: new Date(item.order.completedAt!.getTime() + 60 * 60_000) } });
  }
  for (const product of products) {
    const aggregate = await prisma.review.aggregate({ where: { productId: product.id, isHidden: false }, _avg: { rating: true }, _count: { rating: true } });
    await prisma.product.update({ where: { id: product.id }, data: { averageRating: aggregate._avg.rating ?? 0, totalReviews: aggregate._count.rating } });
  }
}

async function seedNotificationsAndAudit(identity: Awaited<ReturnType<typeof seedIdentity>>) {
  for (const [index, profile] of identity.studentProfiles.entries()) {
    await prisma.notification.createMany({ data: [
      { userId: profile.userId, type: NotificationType.SYSTEM, title: 'Chào mừng đến Canteen VWA', message: 'Đặt món trước để tiết kiệm thời gian trong giờ nghỉ.', isRead: index % 3 === 0, readAt: index % 3 === 0 ? daysBefore(20) : null, createdAt: daysBefore(30) },
      { userId: profile.userId, type: index % 2 === 0 ? NotificationType.VOUCHER : NotificationType.LOYALTY, title: index % 2 === 0 ? 'Bạn có voucher mới' : 'Tích điểm mỗi bữa ăn', message: index % 2 === 0 ? 'Mở mục ưu đãi để xem voucher đang có.' : 'Mỗi đơn hoàn tất đều giúp bạn nhận thêm điểm.', isRead: false, createdAt: daysBefore(index % 7) },
    ] });
  }
  await prisma.auditLog.createMany({ data: [
    { actorUserId: identity.adminUser.id, action: 'SEED_RESET', entityType: 'DATABASE', afterData: { students: 100, registeredStudents: 50, unregisteredStudents: 50, staff: 5, products: 20, orders: 200 }, createdAt: referenceNow },
    { actorUserId: identity.adminUser.id, action: 'UPDATE_SETTINGS', entityType: 'CanteenSetting', entityId: 'default', afterData: { canteenName: 'Canteen VWA' }, createdAt: referenceNow },
  ] });
}

async function main() {
  if (process.argv.includes('--if-empty')) {
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
      prisma.order.count(),
      prisma.canteenSetting.count(),
    ]);
    if (counts.some(count => count > 0)) {
      console.log('Database đã có dữ liệu; bỏ qua việc nạp dữ liệu mẫu tự động.');
      return;
    }
  }

  console.log('Đang xóa toàn bộ dữ liệu nghiệp vụ hiện tại...');
  await resetDatabase();
  const passwordHash = await argon2.hash(password);
  await prisma.canteenSetting.create({ data: {
    id: 'default', canteenName: 'Canteen VWA', address: '68 Nguyễn Chí Thanh, phường Láng, Hà Nội',
    openingTime: '06:45', closingTime: '18:00', contactInformation: '024 3775 1750', defaultPickupInterval: 15,
    pointValueVnd: 100, comboDiscountPercent: 12, timezone: 'Asia/Ho_Chi_Minh',
    expenses: [{ name: 'Nguyên liệu', amount: 68000000, month: '2026-09' }, { name: 'Nhân sự', amount: 32000000, month: '2026-09' }, { name: 'Điện nước', amount: 8500000, month: '2026-09' }, { name: 'Vận hành khác', amount: 4500000, month: '2026-09' }],
  } });
  const identity = await seedIdentity(passwordHash);
  const products = await seedCatalog();
  await seedInventory(products, identity.admin.id);
  const promotions = await seedPromotions();
  await seedStudentBenefits(identity.studentProfiles, products, promotions.vouchers);
  await seedWorkforce(identity.employees);
  await seedOrders(products, identity.studentProfiles, identity.employees, promotions.coupons);
  await seedNotificationsAndAudit(identity);
  console.log('Hoàn tất: 100 sinh viên (50 đã đăng ký, 50 chưa đăng ký), 1 admin, 2 thu ngân, 2 bếp, 20 món và 200 đơn đa dạng.');
  console.log(`Mật khẩu chung: ${password}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
