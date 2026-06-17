import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DressesService } from './dresses/dresses.service';

const IMGS = [
  'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80',
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80',
  'https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=600&q=80',
  'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600&q=80',
  'https://images.unsplash.com/photo-1583846783214-7229a91b20ed?w=600&q=80',
  'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&q=80',
  'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&q=80',
  'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=600&q=80',
];
const img = (i: number) => IMGS[((i % IMGS.length) + IMGS.length) % IMGS.length];

const SEED = [
  { title: 'שמלת ערב אדומה זוהרת', desc: 'שמלה אדומה ארוכה עם שובל עדין, מושלמת לאירוע מרשים. נלבשה פעם אחת בלבד.', color: 'אדום', colorHex: '#B23A48', condition: 'כמו חדשה', length: 'ארוך', price: 280, region: 'גוש דן', size: 'M', source: 'תפירה אישית', store: '', phone: '0521111111', email: 'a@x.com' },
  { title: 'שמלת מקסי שמפניה', desc: 'גוון שמפניה רך עם תחרה צרפתית, מחמיא לכל גוף.', color: 'שמפניה', colorHex: '#D9C2A0', condition: 'חדשה', length: 'ארוך', price: 340, region: 'מרכז', size: 'S', source: 'שם חנות', store: 'Boutique Lior', phone: '0522222222', email: 'b@x.com' },
  { title: 'שמלת קוקטייל שחורה', desc: 'קלאסיקה שחורה באורך ברך, אלגנטית ונצחית.', color: 'שחור', colorHex: '#2A2A2A', condition: 'טובה מאוד', length: 'בינוני', price: 190, region: 'ירושלים', size: 'L', source: 'תפירה אישית', store: '', phone: '0523333333', email: 'c@x.com' },
  { title: 'שמלת נסיכה תכלת', desc: 'גוון תכלת חולמני עם חצאית נפוחה, לאירוע יוצא דופן.', color: 'תכלת', colorHex: '#A9C5D6', condition: 'כמו חדשה', length: 'ארוך', price: 310, region: 'חיפה והכרמל', size: 'M', source: 'שם חנות', store: 'Dvash', phone: '0524444444', email: 'd@x.com' },
  { title: 'שמלת זמש ירוק בקבוק', desc: 'ירוק עמוק עם גזרה מחטבת, תחושת קטיפה.', color: 'ירוק', colorHex: '#3E5A48', condition: 'טובה מאוד', length: 'ארוך', price: 260, region: 'צפון', size: 'M', source: 'תפירה אישית', store: '', phone: '0525555555', email: 'e@x.com' },
  { title: 'שמלת מיני נצנצים', desc: 'שמלת מיני מנצנצת לערב בלתי נשכח, נוחה לריקודים.', color: 'כסף', colorHex: '#C8C8CC', condition: 'חדשה', length: 'קצר', price: 170, region: 'גוש דן', size: 'XS', source: 'שם חנות', store: 'Glam', phone: '0526666666', email: 'f@x.com' },
  { title: 'שמלת ערב סגול עמוק', desc: 'גוון סגול מלכותי, מחשוף עדין וגב חשוף.', color: 'סגול', colorHex: '#5E4B79', condition: 'טובה', length: 'ארוך', price: 220, region: 'דרום', size: 'L', source: 'תפירה אישית', store: '', phone: '0527777777', email: 'g@x.com' },
  { title: 'שמלת סאטן ורד אבק', desc: 'סאטן בגוון ורוד אבקתי, נופל בצורה מושלמת.', color: 'ורוד', colorHex: '#C4A0A0', condition: 'כמו חדשה', length: 'בינוני', price: 240, region: 'מרכז', size: 'S', source: 'שם חנות', store: 'Rosa', phone: '0528888888', email: 'h@x.com' },
];

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(private readonly dresses: DressesService) {}

  async onApplicationBootstrap() {
    const count = await this.dresses.count();
    if (count > 0) return; // only seed an empty database
    await this.dresses.saveMany(
      SEED.map((d, i) => ({
        ...d,
        status: 'approved' as const,
        images: [img(i), img(i + 1), img(i + 2)],
        booked: [],
      })),
    );
    // eslint-disable-next-line no-console
    console.log(`[seed] inserted ${SEED.length} approved dresses`);
  }
}
