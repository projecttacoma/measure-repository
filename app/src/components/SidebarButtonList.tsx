import { Badge, Button } from '@mantine/core';
import Link from 'next/link';

interface SidebarButtonListProps {
  buttonData: Record<string, number>;
  routePrefix?: string;
}

function SidebarButtonList({ buttonData, routePrefix = '/' }: SidebarButtonListProps) {
  return (
    <>
      {Object.keys(buttonData).map(k => (
        <Link href={`${routePrefix}/${k}`} key={k}>
          <Button fullWidth variant="subtle" rightIcon={<Badge>{buttonData[k]}</Badge>}>
            {k}
          </Button>
        </Link>
      ))}
    </>
  );
}

export default SidebarButtonList;
