import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';
export const alt = "What's Going On — Local events in Bristol & the East Bay, RI";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  const logo = await readFile(join(process.cwd(), 'app', 'icon.png'));
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F4EFE9',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={460} height={460} alt="" />
        <div
          style={{
            marginTop: 8,
            fontSize: 36,
            fontWeight: 600,
            color: '#1C3D55',
            letterSpacing: 1,
          }}
        >
          Local events in Bristol &amp; the East Bay
        </div>
      </div>
    ),
    { ...size }
  );
}
