import '@/styles/globals.css';
import { AppShell, Button, Center, Header, MantineProvider, Navbar, Text, Divider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import { ResourceCounts } from '../components/ResourceCounts';
import { trpc } from '@/util/trpc';
import { Open_Sans } from 'next/font/google';
import { useRouter } from 'next/dist/client/router';

const openSans = Open_Sans({
  subsets: ['latin']
});

function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  console.log(router);
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
        <Notifications position="top-center" />
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
              px={18}
              sx={theme => {
                const shade =
                  typeof theme.primaryShade === 'number' ? theme.primaryShade : theme.primaryShade[theme.colorScheme];

                return {
                  backgroundColor: theme.colors[theme.primaryColor][shade],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                };
              }}
            >
              <div>
                <Link href="/">
                  <Text c="white" weight="bold">
                    Measure Repository
                  </Text>
                </Link>
              </div>
              <div>
                <Link href={`/authoring`} style={{ width: '100%' }}>
                  <div
                    style={{
                      padding: 18,
                      backgroundColor: router.route.split('/')[1] === 'authoring' ? 'yellow' : 'blue'
                    }}
                  >
                    <Text c="white" weight="bold">
                      Authoring
                    </Text>
                  </div>
                </Link>
              </div>
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
