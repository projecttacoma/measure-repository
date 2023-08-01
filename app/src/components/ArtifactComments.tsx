import { Avatar, createStyles, Group, Paper, rem, Text, TypographyStylesProvider } from '@mantine/core';
import { useHover } from '@mantine/hooks';
import { useEffect, useState } from 'react';

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
  const { hovered, ref } = useHover();
  const [color, setColor] = useState('grey');
  const [displayedDate, setDisplayedDate] = useState<string | undefined>(date);

  // This changes the UTC date format into the 'mm/dd/yyyy' format
  function getDate() {
    if (date) {
      const stringDate = new Date(date);
      return `${stringDate.getMonth()}/${stringDate.getDate()}/${stringDate.getFullYear()}`;
    }
  }

  const formattedDate = getDate();

  function changeDate() {
    if (displayedDate === date) {
      setDisplayedDate(formattedDate);
    } else {
      setDisplayedDate(date);
    }
  }

  // Changes the color of the date text depending on if the user is hovering over the text or not
  useEffect(() => {
    if (hovered === true) {
      setColor('blue');
    } else {
      setColor('grey');
    }
  }, [hovered]);

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
            <div ref={ref} style={{ cursor: 'pointer' }}>
              <Text variant="subtle" fz="xs" onClick={changeDate} opacity={0.8} color={color}>
                {date ? displayedDate : ''}
              </Text>
            </div>
          </div>
        </Group>
        <div style={{ wordBreak: 'break-word' }}>
          <TypographyStylesProvider className={classes.body}>
            {body && <div className={classes.content} dangerouslySetInnerHTML={{ __html: body }} />}
          </TypographyStylesProvider>
        </div>
      </div>
    </Paper>
  );
}
