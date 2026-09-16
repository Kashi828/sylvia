import './globals.css';
import './sylvia-theme.css';
import './sylvia-ui-fix.css';
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'SYLVIA — IoT Platform',
  description: 'Software-first IoT control platform and virtual device lab.'
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
