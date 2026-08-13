/* Mirrors variantsFor()/withWidthSuffix() from StorageService. sharp itself
   can't run here (Windows-only binaries), but the URL derivation is pure
   string logic and is where a mistake would silently produce 404 srcsets. */
const BUCKET = 'dress-images';
const VARIANT_PREFIX = 'v2';
const BASE = 'https://proj.supabase.co';
const NO_VARIANTS = { url400: null, url800: null, url1200: null };

function withWidthSuffix(url: string, width: number): string {
  const slash = url.lastIndexOf('/');
  const dot = url.indexOf('.', slash + 1);
  return dot === -1 ? `${url}_${width}` : `${url.slice(0, dot)}_${width}${url.slice(dot)}`;
}
function variantsFor(url: string) {
  const marker = `/storage/v1/object/public/${BUCKET}/${VARIANT_PREFIX}/`;
  if (!url || !url.includes(marker)) return { ...NO_VARIANTS };
  return {
    url400: withWidthSuffix(url, 400),
    url800: withWidthSuffix(url, 800),
    url1200: withWidthSuffix(url, 1200),
  };
}

let fail = 0;
const ok = (n: string, c: boolean) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n); if (!c) fail++; };
const pub = (p: string) => `${BASE}/storage/v1/object/public/${BUCKET}/${p}`;

const neu = pub(`${VARIANT_PREFIX}/abc/11111111-2222.jpg`);
const v = variantsFor(neu);
ok('new upload gets all three variants', !!v.url400 && !!v.url800 && !!v.url1200);
ok('suffix goes before the extension', v.url400 === pub(`${VARIANT_PREFIX}/abc/11111111-2222_400.jpg`));
ok('1200 variant correct', v.url1200 === pub(`${VARIANT_PREFIX}/abc/11111111-2222_1200.jpg`));

const legacy = pub('abc/11111111-2222.jpg');
ok('pre-pipeline photo reports no variants', variantsFor(legacy).url400 === null);

const pendingLegacy = pub('pending/dead-beef.png');
ok('legacy "pending" folder reports no variants', variantsFor(pendingLegacy).url800 === null);

ok('empty url is safe', variantsFor('').url400 === null);
ok('non-supabase url is untouched', variantsFor('https://cdn.example.com/x/v2/a.jpg').url400 === null);

const webp = pub(`${VARIANT_PREFIX}/d/e.webp`);
ok('webp extension preserved', variantsFor(webp).url800 === pub(`${VARIANT_PREFIX}/d/e_800.webp`));

// A dress folder literally named "v2" must not be mistaken for the prefix:
// the marker requires v2 immediately after the bucket segment.
const dressNamedV2 = pub('v2x/e.jpg');
ok('prefix match is not a loose substring', variantsFor(dressNamedV2).url400 === null);

const dotless = pub(`${VARIANT_PREFIX}/d/noext`);
ok('extension-less path still derives a variant', variantsFor(dotless).url400 === pub(`${VARIANT_PREFIX}/d/noext_400`));

console.log(fail === 0 ? '\nALL VARIANT URL TESTS PASS' : `\n${fail} FAILED`);
process.exit(fail ? 1 : 0);
