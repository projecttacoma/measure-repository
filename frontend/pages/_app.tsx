import '@/styles/globals.css';
import { AppShell, Center, Header, MantineProvider } from '@mantine/core';
import type { AppProps } from 'next/app';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Measure Repository Service Frontend</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
      </Head>
      <MantineProvider
        withGlobalStyles
        withNormalizeCSS
        theme={{
          /** Put your mantine theme override here */
          colorScheme: 'light'
        }}
      >
        <AppShell
          padding="md"
          header={
            <Header height={80} style={{ backgroundColor: '#bdebf0', color: '#4a4f4f' }}>
              <Center>
                <h1 style={{ marginTop: '12px', cursor: 'pointer' }}>Measure Repository Service Frontend</h1>
              </Center>
            </Header>
          }
        >
          <Component {...pageProps} />
        </AppShell>
      </MantineProvider>
    </>
  );
}
