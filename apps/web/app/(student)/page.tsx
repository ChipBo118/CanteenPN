import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight,CheckCircle2,Clock3,Leaf,Mail,MapPin,PackageCheck,Phone,Search,ShoppingBag,Star } from 'lucide-react';
import { StudentHeader,Brand } from '@/components/student-header';
import { FavoriteButton } from '@/components/favorite-button';
import { HomeAddToCartButton } from '@/components/home-add-to-cart-button';

const categories=[{name:'Cơm',slug:'com',icon:'🍚'},{name:'Phở & Bún',slug:'pho-bun',icon:'🍜'},{name:'Mì & Bánh mì',slug:'mi-banh-mi',icon:'🥖'},{name:'Ăn vặt',slug:'an-vat',icon:'🥟'},{name:'Đồ uống',slug:'do-uong',icon:'🥤'},{name:'Món chay',slug:'mon-chay',icon:'🌱'}];
const featured=[
  {name:'Cơm gà xối mỡ',slug:'com-ga-xoi-mo',price:38000,image:'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=82',time:14,rating:4.8,badge:'Bán chạy'},
  {name:'Phở bò tái',slug:'pho-bo-tai',price:40000,image:'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=1200&q=82',time:12,rating:4.9,badge:'Yêu thích'},
  {name:'Cơm chay nấm',slug:'com-chay-nam',price:32000,image:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=82',time:10,rating:4.7,badge:'Món chay',vegetarian:true},
];
const money=(value:number)=>new Intl.NumberFormat('vi-VN').format(value)+' ₫';

export default function HomePage(){return <><StudentHeader/><main>
  <section className="relative overflow-hidden bg-[radial-gradient(circle_at_85%_15%,#d7f0e5_0,transparent_27%),linear-gradient(135deg,#fbfaf5,#f4f8f2)] dark:bg-[radial-gradient(circle_at_85%_15%,#17483a_0,transparent_28%),linear-gradient(135deg,#0f1715,#14221e)]"><div className="container-shell grid min-h-[590px] items-center gap-10 py-14 lg:grid-cols-2 lg:py-20"><div className="relative z-10 max-w-2xl"><p className="eyebrow">Bữa trưa nhẹ nhàng hơn</p><h1 className="mt-5 text-[clamp(2.8rem,5.6vw,4.9rem)] font-extrabold leading-[1.04] tracking-[-.06em]">Đặt món trước.<br/><span className="text-brand-600">Không cần xếp hàng.</span></h1><p className="mt-6 max-w-xl text-base leading-8 text-[color:var(--muted)] sm:text-lg">Chọn món bạn thích, hẹn giờ nhận và dành nhiều thời gian hơn cho những điều quan trọng.</p><Link href="/menu" className="button-primary mt-7">Khám phá thực đơn <ArrowRight size={19}/></Link><div className="mt-10 flex gap-8"><div className="border-l-2 border-brand-600 pl-3"><b className="block text-xl">4.8/5</b><span className="text-xs text-[color:var(--muted)]">từ 1.200+ sinh viên</span></div><div className="border-l-2 border-brand-600 pl-3"><b className="block text-xl">~8 phút</b><span className="text-xs text-[color:var(--muted)]">thời gian nhận món</span></div></div></div><div className="relative mx-auto grid h-[360px] w-full max-w-[520px] place-items-center lg:h-[480px]"><span className="absolute left-[8%] top-[4%] text-4xl text-amber-400">✦</span><span className="absolute bottom-[3%] right-[5%] text-2xl text-amber-400">✦</span><div className="relative aspect-square w-[min(80vw,460px)] -rotate-[5deg] overflow-hidden rounded-full border-[18px] border-white bg-white shadow-[0_30px_70px_rgba(28,72,59,.2)] dark:border-[#22302c]"><Image src="/images/com-tam.jpg" alt="Cơm tấm CanteenPN" fill sizes="(max-width: 768px) 80vw, 460px" className="object-cover" priority/></div><div className="absolute bottom-[12%] left-0 flex items-center gap-3 rounded-[15px] border border-white/70 bg-white/95 px-4 py-3 text-brand-900 shadow-soft"><CheckCircle2 className="text-brand-600"/><span><b className="block text-xs">Đặt món thành công</b><small className="text-[10px] text-slate-500">Nhận lúc 11:45</small></span></div><div className="absolute right-0 top-[15%] flex items-center gap-3 rounded-[15px] border border-white/70 bg-white/95 px-4 py-3 text-brand-900 shadow-soft"><Star className="fill-amber-400 text-amber-400"/><span><b className="block text-xs">4.9</b><small className="text-[10px] text-slate-500">Món được yêu thích</small></span></div></div></div></section>

  <section className="container-shell py-16"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><p className="eyebrow">Khám phá theo sở thích</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-.045em] sm:text-4xl">Hôm nay bạn muốn ăn gì?</h2></div><form action="/menu" className="flex h-12 w-full max-w-sm items-center gap-2 rounded-[14px] border bg-[color:var(--surface)] px-4"><Search size={18} className="text-[color:var(--muted)]"/><input name="search" className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Tìm món ăn..."/></form></div><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{categories.map(item=><Link href={`/menu?category=${item.slug}`} key={item.slug} className="surface group rounded-[18px] p-5 text-center transition hover:-translate-y-1 hover:shadow-soft"><span className="block text-3xl transition group-hover:scale-110">{item.icon}</span><b className="mt-3 block text-sm">{item.name}</b></Link>)}</div>
    <div className="mt-16 flex items-end justify-between"><div><p className="eyebrow">Thực đơn hôm nay</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-.045em] sm:text-4xl">Món được yêu thích</h2></div><Link href="/menu" className="hidden text-sm font-bold text-brand-600 sm:block">Xem toàn bộ <ArrowRight size={16} className="inline"/></Link></div><div className="mt-7 grid gap-6 md:grid-cols-3">{featured.map(item=><article key={item.name} className="surface group overflow-hidden rounded-[22px] transition hover:-translate-y-1.5 hover:shadow-soft"><div className="relative h-[230px] overflow-hidden"><Image src={item.image} alt={item.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105"/><span className={`absolute left-3 top-3 flex items-center gap-1 rounded-[10px] bg-white px-3 py-2 text-[10px] font-extrabold text-brand-700 shadow ${item.vegetarian?'bg-emerald-50':''}`}>{item.vegetarian&&<Leaf size={13}/>} {item.badge}</span><FavoriteButton slug={item.slug} name={item.name}/></div><div className="p-5"><div className="flex items-center gap-4 text-xs text-[color:var(--muted)]"><span className="flex items-center gap-1 text-amber-600"><Star size={14} className="fill-current"/> {item.rating}</span><span className="flex items-center gap-1"><Clock3 size={14}/> {item.time} phút</span></div><h3 className="mt-3 text-xl font-extrabold">{item.name}</h3><p className="mt-2 min-h-10 text-xs leading-5 text-[color:var(--muted)]">Chuẩn bị tươi mới trong ngày, vừa vị và phù hợp cho giờ nghỉ giữa buổi.</p><div className="mt-5 flex items-center justify-between"><div><strong className="text-lg text-brand-600">{money(item.price)}</strong><small className="block text-[10px] text-[color:var(--muted)]">Còn món hôm nay</small></div><HomeAddToCartButton slug={item.slug} name={item.name}/></div></div></article>)}</div>
  </section>

  <section className="bg-brand-900 py-16 text-center text-white"><div className="container-shell"><p className="eyebrow text-emerald-300">Nhanh gọn trong 3 bước</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-.045em] sm:text-4xl">Đói bụng? CanteenPN lo.</h2><div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">{[[ShoppingBag,'Chọn món','Khám phá thực đơn tươi ngon mỗi ngày.'],[Clock3,'Hẹn giờ nhận','Chọn khung giờ phù hợp với lịch học.'],[PackageCheck,'Nhận món','Quét QR tại quầy, không cần chờ đợi.']].map(([Icon,title,copy],index)=>{const C=Icon as typeof ShoppingBag;return <article key={title as string} className="relative rounded-[20px] border border-white/10 bg-white/5 px-6 py-9 text-left"><span className="absolute right-4 top-2 text-4xl font-extrabold text-white/10">{index+1}</span><C className="text-emerald-300" size={34}/><h3 className="mt-5 text-lg font-extrabold">{title as string}</h3><p className="mt-2 text-xs leading-6 text-white/65">{copy as string}</p></article>})}</div></div></section>
  <footer className="border-t bg-[color:var(--surface)]">
    <div className="container-shell grid gap-8 py-10 md:grid-cols-[1fr_1fr_1.25fr] md:items-start">
      <div>
        <Brand/>
        <p className="mt-4 max-w-sm text-sm leading-6 text-[color:var(--muted)]">
          Đặt món nhanh, nhận món đúng giờ và phục vụ tận tâm cho sinh viên, cán bộ.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-extrabold uppercase tracking-[.12em] text-brand-600">Liên hệ</h2>
        <div className="mt-4 space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-100"><Phone size={17}/></span>
            <span><small className="block text-[color:var(--muted)]">Hotline</small><strong>0328 866 959</strong></span>
          </div>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-100"><Mail size={17}/></span>
            <span><small className="block text-[color:var(--muted)]">Email</small><strong>admin@vwa.vn</strong></span>
          </div>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-100"><MapPin size={17}/></span>
            <span><small className="block text-[color:var(--muted)]">Địa chỉ</small><strong>Học viện Phụ nữ Việt Nam, 68 Nguyễn Chí Thanh, P. Láng, Hà Nội</strong></span>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3">
          <h2 className="text-sm font-extrabold uppercase tracking-[.12em] text-brand-600">Google Maps</h2>
        </div>
        <div className="h-44 overflow-hidden rounded-2xl border bg-brand-50 shadow-sm">
          <iframe
            title="Bản đồ CanteenPN"
            src="https://www.google.com/maps?q=H%E1%BB%8Dc+vi%E1%BB%87n+Ph%E1%BB%A5+n%E1%BB%AF+Vi%E1%BB%87t+Nam,+68+Nguy%E1%BB%85n+Ch%C3%AD+Thanh,+H%C3%A0+N%E1%BB%99i&output=embed"
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  </footer>
  </main></>}
