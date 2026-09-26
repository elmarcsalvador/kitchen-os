import './globals.css';

export const metadata = {
  title: 'Kitchen OS',
  description: 'Shared kitchen inventory, expiry, and barcode tracking.'
};
export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
