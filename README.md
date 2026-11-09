# Remotion Video Project

Project ini berisi beberapa video Remotion dalam **satu project**. Setiap video
disimpan di folder terpisah, punya **Composition ID** sendiri, dan bisa
di-preview maupun di-export secara terpisah.

## Daftar isi

- [Video yang tersedia](#video-yang-tersedia)
- [Persiapan](#persiapan)
- [Preview video](#preview-video)
- [Ekspor video](#ekspor-video)
- [Menambah / impor video baru](#menambah--impor-video-baru)
- [Impor aset gambar, audio, dan video](#impor-aset-gambar-audio-dan-video)
- [Struktur folder](#struktur-folder)
- [Tips dan troubleshooting](#tips-dan-troubleshooting)
- [Perintah lain](#perintah-lain)
- [Dokumentasi](#dokumentasi)

## Video yang tersedia

| Video | Composition ID | Kode sumber | Hasil export |
| --- | --- | --- | --- |
| Video 10 detik | `Video10Detik` | `src/videos/video-10-detik/Video10Detik.tsx` | `out/video-10-detik.mp4` |
| Pixel Vlog 20 detik | `PixelVlog20Detik` | `src/videos/pixel-vlog-20-detik/PixelVlog.tsx` | `out/pixel-vlog-20-detik.mp4` |

Semua video didaftarkan di `src/Root.tsx`.

## Persiapan

Butuh Node.js versi **20.19+**, **22.13+**, atau **24+**.

```console
npm install
```

Cek versi Node:

```console
node -v
```

## Preview video

```console
npm run dev
```

Remotion Studio akan terbuka. Pilih video dari daftar **Composition** di panel
kiri, lalu tekan play untuk melihat hasilnya.

Lihat daftar Composition ID tanpa membuka Studio:

```console
npm run compositions
```

Preview satu frame sebagai gambar PNG:

```console
npx remotion still PixelVlog20Detik out/thumbnail.png --frame=40
```

## Ekspor video

Ekspor video di Remotion disebut juga **render**. Hasil default berupa MP4
(H.264) dan disimpan di folder `out/`.

### Ekspor cepat

```console
npm run render:video10
npm run render:pixelvlog
```

Atau export semua video sekaligus:

```console
npm run render:all
```

### Ekspor manual

Format perintahnya:

```console
npx remotion render <CompositionID> <file-output>
```

Contoh:

```console
npx remotion render Video10Detik out/video-10-detik.mp4
npx remotion render PixelVlog20Detik out/pixel-vlog-20-detik.mp4
```

### Opsi export

| Kebutuhan | Perintah |
| --- | --- |
| Kualitas lebih tinggi | `npx remotion render Video10Detik out/video-hq.mp4 --crf=16` |
| Resolusi lebih kecil | `npx remotion render PixelVlog20Detik out/pixel-kecil.mp4 --scale=0.5` |
| Render sebagian saja | `npx remotion render PixelVlog20Detik out/preview.mp4 --frames=0-149` |
| Export GIF | `npx remotion render PixelVlog20Detik out/pixel.gif --codec=gif` |
| Thumbnail PNG | `npx remotion still PixelVlog20Detik out/thumb.png --frame=60` |

Catatan:

- `--frames=0-149` hanya merender frame 0 sampai 149 (5 detik pertama).
- File output lama akan ditimpa karena `Config.setOverwriteOutput(true)` aktif
  di `remotion.config.ts`.
- Folder `out/` tidak masuk Git, jadi hasil render perlu dibagikan manual.

## Menambah / impor video baru

### 1. Buat folder video

Buat folder baru di dalam `src/videos/`, misalnya:

```text
src/videos/video-baru/
```

### 2. Buat komponen video

Buat file `src/videos/video-baru/VideoBaru.tsx`:

```tsx
import { AbsoluteFill, Composition, interpolate, useCurrentFrame } from "remotion";

const VideoBaruScene = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0b1020",
        color: "#ffffff",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1 style={{ opacity }}>Video Baru</h1>
    </AbsoluteFill>
  );
};

export const VideoBaruComposition = () => {
  return (
    <Composition
      id="VideoBaru"
      component={VideoBaruScene}
      durationInFrames={30 * 15}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
```

`durationInFrames={30 * 15}` artinya 15 detik pada 30 fps.

### 3. Impor dan daftarkan di Root

Buka `src/Root.tsx`, lalu tambahkan:

```tsx
import { VideoBaruComposition } from "./videos/video-baru/VideoBaru";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Video10DetikComposition />
      <PixelVlogComposition />
      <VideoBaruComposition />
    </>
  );
};
```

Pastikan `id` setiap Composition **unik**. Cek dengan:

```console
npm run compositions
```

### 4. Tambahkan script export (opsional)

Di `package.json`:

```json
"render:videobaru": "remotion render VideoBaru out/video-baru.mp4"
```

Lalu export dengan:

```console
npm run render:videobaru
```

### 5. Impor video dari project Remotion lain

1. Copy folder video dari project lama, misalnya
   `src/videos/video-baru/`.
2. Copy asetnya ke `public/videos/video-baru/`.
3. Daftarkan komposisinya di `src/Root.tsx` project ini.
4. Jika video memakai library tambahan, tambahkan dependensinya di
   `package.json`, lalu jalankan `npm install`.
5. Jalankan `npm run compositions` untuk memastikan videonya terdaftar.

## Impor aset gambar, audio, dan video

Simpan aset di folder `public/`, misalnya:

```text
public/videos/video-baru/
  foto.png
  musik.mp3
  klip.mp4
```

Gunakan `staticFile()` untuk mengaksesnya. Path **tidak** diawali `public/`:

```tsx
import { Audio, Img, OffthreadVideo, staticFile } from "remotion";

<Img src={staticFile("videos/video-baru/foto.png")} />

<Audio src={staticFile("videos/video-baru/musik.mp3")} />

<OffthreadVideo src={staticFile("videos/video-baru/klip.mp4")} />
```

- `<Img>` untuk gambar.
- `<Audio>` untuk musik/suara.
- `<OffthreadVideo>` untuk footage video di dalam komposisi.
- Font khusus disimpan di `public/videos/.../fonts/` dan dimuat dengan
  `FontFace` / `staticFile()`. Contohnya ada di
  `src/videos/pixel-vlog-20-detik/PixelVlog.tsx`.

Video yang sekarang ada belum memiliki audio. Untuk menambahkan musik, import
`<Audio>` seperti contoh di atas dan pastikan file audio sudah ada di `public/`.

## Struktur folder

```text
my-video/
├─ src/
│  ├─ index.ts
│  ├─ Root.tsx
│  └─ videos/
│     ├─ video-10-detik/
│     │  └─ Video10Detik.tsx
│     └─ pixel-vlog-20-detik/
│        └─ PixelVlog.tsx
├─ public/
│  └─ videos/
│     └─ pixel-vlog-20-detik/
│        └─ fonts/
│           └─ PressStart2P-Regular.ttf
├─ out/                  ← hasil export (tidak masuk Git)
├─ package.json
├─ remotion.config.ts
└─ README.md
```

## Tips dan troubleshooting

- **Render satu per satu.** Jangan menjalankan beberapa perintah `remotion
  render`/`still` bersamaan di project yang sama; cache Rspack bisa bentrok.
- **Render pertama butuh internet.** Remotion akan mengunduh Chrome Headless
  Shell sekitar 131 MB.
- **Render terasa lama?** Render 1080p 20 detik memang lebih berat. Untuk
  percobaan cepat, gunakan `--frames=0-149` atau `--scale=0.5`.
- **Cache bermasalah?** Hapus folder `node_modules/.cache`, lalu render ulang.
- **Font tidak muncul?** Pastikan file font ada di `public/...` dan path di
  `staticFile()` sama persis.
- **Composition tidak ditemukan?** Cek ID dengan `npm run compositions`; ID
  bersifat case-sensitive.
- **Kode video jangan hilang.** Commit folder `src/`, `public/`, `package.json`,
  dan `package-lock.json` ke Git. Folder `out/` dan `node_modules/` diabaikan.

Contoh menyimpan kode ke Git:

```console
git add src public package.json package-lock.json README.md
git commit -m "Tambah video dan dokumentasi export"
```

## Perintah lain

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Buka Remotion Studio untuk preview |
| `npm run compositions` | Tampilkan semua Composition ID |
| `npm run lint` | Cek TypeScript dan aturan ESLint |
| `npm run build` | Bundle project untuk deployment (bukan export MP4) |
| `npm run upgrade` | Upgrade Remotion |
| `npm run render:all` | Export semua video |

## Dokumentasi

- [Remotion Fundamentals](https://www.remotion.dev/docs/the-fundamentals)
- [Remotion CLI / render](https://www.remotion.dev/docs/cli/render)
- [staticFile()](https://www.remotion.dev/docs/staticfile)
- [OffthreadVideo](https://www.remotion.dev/docs/offthreadvideo)

Butuh bantuan? Bergabung ke [Discord Remotion](https://remotion.dev/discord).

## Lisensi

Untuk beberapa entitas, lisensi komersial Remotion diperlukan. Baca
[ketentuan lisensinya](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
