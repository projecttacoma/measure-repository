import '@/styles/globals.css';
import {
  AppShell,
  Button,
  Center,
  Header,
  MantineProvider,
  Navbar,
  Text,
  Divider,
  Group,
  createStyles
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import ServiceResourceButtons from '../components/ServiceResourceButtons';
import { trpc } from '@/util/trpc';
import { Open_Sans } from 'next/font/google';
import { useRouter } from 'next/dist/client/router';
import { IconDatabase } from '@tabler/icons-react';
import DraftResourceButtons from '@/components/DraftResourceButtons';

const openSans = Open_Sans({
  subsets: ['latin']
});

const useStyles = createStyles(theme => ({
  brandContainer: {
    position: 'absolute'
  },
  dbIcon: {
    color: theme.colors.orange[3]
  },
  navGroup: {
    width: '100%'
  }
}));

function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { classes } = useStyles();
  const authoring = trpc.service.getAuthoring.useQuery();
  let authoringTab = false;
  if (
    router.asPath.endsWith('authoring=true') ||
    router.pathname.startsWith('/authoring') ||
    router.asPath.includes('status=draft')
  ) {
    authoringTab = true;
  }

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
              {authoringTab ? (
                <>
                  <Navbar.Section pt={18}>
                    <Center>
                      <Text c="gray">Draft Artifacts</Text>
                    </Center>
                  </Navbar.Section>
                  <Divider my="md" />
                  <Navbar.Section px={18}>
                    <Link href={'/search?resourceType=Measure&authoring=true'}>
                      <Button variant="default" fullWidth>
                        Search
                      </Button>
                    </Link>
                  </Navbar.Section>
                  <Navbar.Section grow pt={18}>
                    <DraftResourceButtons />
                  </Navbar.Section>
                </>
              ) : (
                <>
                  <Navbar.Section pt={18}>
                    <Center>
                      <Text c="gray">Measure Repository Artifacts</Text>
                    </Center>
                  </Navbar.Section>
                  <Divider my="md" />
                  <Navbar.Section px={18}>
                    <Link href={'/search?resourceType=Measure&authoring=false'}>
                      <Button variant="default" fullWidth>
                        Search
                      </Button>
                    </Link>
                  </Navbar.Section>
                  <Navbar.Section grow pt={18}>
                    <ServiceResourceButtons />
                  </Navbar.Section>
                </>
              )}
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
              <div className={classes.brandContainer}>
                <Link href="/">
                  <Group align="center" spacing="xs">
                    <Center>
                      <IconDatabase className={classes.dbIcon} />
                    </Center>
                    <Text c="white" weight="bold">
                      Measure Repository
                    </Text>
                  </Group>
                </Link>
              </div>
              <Group position="center" className={classes.navGroup} spacing="xl">
                <Link href="/">
                  <Text c={!authoringTab ? 'orange.3' : 'gray.4'}>Repository</Text>
                </Link>
                {authoring.data ? (
                  <Link href="/authoring">
                    <Text c={authoringTab ? 'orange.3' : 'gray.4'}>Authoring</Text>
                  </Link>
                ) : (
                  <> </>
                )}
              </Group>
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
