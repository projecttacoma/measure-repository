import { Center, ScrollArea, Space, Text, Timeline } from '@mantine/core';
import { Message } from 'tabler-icons-react';
import { useEffect, useState } from 'react';
import ArtifactComments from './ArtifactComments';
import { ArtifactCommentProps } from './ArtifactComments';

interface ArtifactTimelineProps {
  extensions?: fhir4.Extension[];
}

type commentProps = {
  author?: string;
  date?: string;
  body?: string;
  type?: string;
};

function addArtifactComment({ date, body, author }: ArtifactCommentProps) {
  return (
    <div>
      <ArtifactComments date={date} body={body} author={author} />
    </div>
  );
}

function noCommentsAvailable() {
  return (
    <div>
      <Center>
        <Text color="red">
          <i>No Comments Found for Artifact</i>{' '}
        </Text>
      </Center>
    </div>
  );
}

export default function ArtifactTimeline(extensionArr: ArtifactTimelineProps) {
  const [height, setWindowHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return window.removeEventListener('resize', handleResize);
  }, []);

  if (extensionArr?.extensions) {
    if (extensionArr.extensions.length === 0) {
      return <div>{noCommentsAvailable()}</div>;
    } else {
      const commentArray: commentProps[] = [];

      extensionArr.extensions.forEach(e => {
        const newComment: commentProps = {};
        e.extension?.forEach(e => {
          if (e.valueDateTime) {
            newComment.date = e.valueDateTime;
          } else if (e.valueString) {
            newComment.author = e.valueString;
          } else if (e.valueMarkdown) {
            newComment.body = e.valueMarkdown;
          } else if (e.valueCode) {
            newComment.type = e.valueCode;
          }
        });
        if (newComment.body && newComment.type) {
          commentArray.push(newComment);
        }
      });

      if (commentArray.length === 0) {
        return <div>{noCommentsAvailable()}</div>;
      } else {
        return (
          <div>
            <Space h="md" />
            <Center>
              <ScrollArea.Autosize mah={height * 0.8} type="scroll">
                <Timeline active={0} bulletSize={35} lineWidth={6}>
                  {commentArray?.reverse().map((e, index) => (
                    <Timeline.Item lineVariant="dotted" bullet={<Message size={25} />} title={e.type} key={index}>
                      {addArtifactComment({
                        date: e?.date,
                        body: e?.body,
                        author: e?.author
                      })}
                    </Timeline.Item>
                  ))}
                </Timeline>
              </ScrollArea.Autosize>
            </Center>
          </div>
        );
      }
    }
  } else {
    return <div>{noCommentsAvailable()}</div>;
  }
}
