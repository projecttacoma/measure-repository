import '@/styles/globals.css';
import { AppShell, Center, Header, MantineProvider, Navbar, Text, Divider, Button } from '@mantine/core';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import { ResourceCounts } from '../components/ResourceCounts';
import { trpc } from '@/util/trpc';
import { Open_Sans } from 'next/font/google';

const openSans = Open_Sans({
  subsets: ['latin']
});

function App({ Component, pageProps }: AppProps) {
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
          colorScheme: 'light',
          fontFamily: openSans.style.fontFamily
        }}
      >
        <AppShell
          padding="md"
          /** Consistent navbar shows available resources as regular content page changes to drill into details */
          navbar={
            <Navbar width={{ base: '320px' }}>
              <Navbar.Section pt={18}>
                <Center>
                  <Text c="gray">Browse Measure Repository</Text>
                </Center>
              </Navbar.Section>
              <Divider my="md" />
              <Navbar.Section px={18}>
                <Link href={'/search?resourceType=Measure'}>
                  <Button variant="default" fullWidth>
                    Search
                  </Button>
                </Link>
              </Navbar.Section>

              <Navbar.Section grow pt={18}>
                <ResourceCounts />
              </Navbar.Section>
            </Navbar>
          }
          header={
            <Header
              color="blue"
              height={48}
              sx={theme => {
                const shade =
                  typeof theme.primaryShade === 'number' ? theme.primaryShade : theme.primaryShade[theme.colorScheme];

                return {
                  backgroundColor: theme.colors[theme.primaryColor][shade],
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '18px'
                };
              }}
            >
              <Link href="/">
                <Text c="white" weight="bold">
                  Measure Repository
                </Text>
              </Link>
            </Header>
          }
          styles={theme => ({
            main: {
              backgroundColor: theme.colors.gray[0]
            }
          })}
        >
          <Component {...pageProps} />
        </AppShell>
      </MantineProvider>
    </>
  );
}

export default trpc.withTRPC(App);
