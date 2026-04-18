import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MidPoint - 异地约会出行规划',
  description: '寻找两个城市之间的最佳约会地点',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <script
          type="text/javascript"
          src={`https://webapi.amap.com/maps?v=2.0&key=${process.env.NEXT_PUBLIC_AMAP_KEY}`}
          async
        ></script>
      </body>
    </html>
  );
}