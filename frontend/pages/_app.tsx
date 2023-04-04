import '@/styles/globals.css';
import { AppShell, Center, Header, MantineProvider, Navbar, Text, Divider, Box, ScrollArea } from '@mantine/core';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { ResourceCounts } from '../components/ResourceCounts';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Measure Repository</title>
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
          navbar={
            <Navbar width={{ base: '18vw' }} height="90vh" p="xs">
              <Navbar.Section>
                <Box
                  sx={theme => ({
                    backgroundColor: 'white',
                    textAlign: 'center',
                    paddingTop: '8px',
                    paddingBottom: '12px',
                    borderRadius: theme.radius.xs,
                    cursor: 'pointer'
                  })}
                >
                  <Text size="xl" weight={700} color="gray">
                    Resources
                  </Text>
                </Box>
              </Navbar.Section>
              <Divider my="sm" style={{ paddingBottom: '15px' }} />
              <Navbar.Section grow component={ScrollArea} mt="-xs" mb="-xs" ml="-xl" mr="-xs">
                <ResourceCounts />
              </Navbar.Section>
            </Navbar>
          }
          header={
            <Header height={80} style={{ backgroundColor: '#bdebf0', color: '#4a4f4f' }}>
              <Center>
                <h1 style={{ marginTop: '12px', cursor: 'pointer' }}>Measure Repository</h1>
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
