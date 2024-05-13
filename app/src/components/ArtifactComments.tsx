import { Avatar, createStyles, Group, Paper, rem, Text, TypographyStylesProvider } from '@mantine/core';
import parse from 'html-react-parser';

const useStyles = createStyles(theme => ({
  card: {
    borderRadius: 12,
    border: `${rem(2)} solid ${theme.colors.gray[3]}`,
    width: '800px'
  },
  comment: {
    padding: `${theme.spacing.lg} ${theme.spacing.xl}`
  },

  body: {
    borderRadius: 12,
    paddingLeft: rem(54),
    paddingTop: theme.spacing.sm,
    fontSize: theme.fontSizes.sm
  },

  content: {
    '& > p:last-child': {
      marginBottom: 0
    },
    width: '800px'
  }
}));

export interface ArtifactCommentProps {
  date?: string;
  body?: string;
  author?: string;
}

export default function ArtifactComments({ date, body, author }: ArtifactCommentProps) {
  const { classes } = useStyles();

  return (
    <Paper withBorder radius="md" className={classes.card} shadow="md">
      <div className={classes.comment}>
        <Group>
          <Avatar src="h" alt="n" radius="xl" color="blue">
            {author ? author.charAt(0).toUpperCase() : ''}
          </Avatar>
          <div style={{ wordBreak: 'break-word' }}>
            <Text weight={500} fz="sm">
              {author ? author : 'Guest'}
            </Text>
            <Text variant="subtle" fz="xs" opacity={0.8} color={'grey'}>
              {date ? date : ''}
            </Text>
          </div>
        </Group>
        <div style={{ wordBreak: 'break-word' }}>
          <TypographyStylesProvider className={classes.body}>
            {body && <div className={classes.content} /> && parse(body)}
          </TypographyStylesProvider>
        </div>
      </div>
    </Paper>
  );
}
