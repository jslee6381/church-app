import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-5">
      <Link
        className="inline-flex min-h-11 items-center gap-2 bg-transparent px-0 text-base font-semibold text-foreground"
        href="/home"
      >
        <ChevronLeft className="size-4" />
        Home
      </Link>
      <div className="mt-4">
        <h1 className="mb-0 font-sans text-[1.6rem] leading-tight text-foreground">{title}</h1>
        {description ? <p className="ui-text mt-2 mb-0 text-muted-foreground">{description}</p> : null}
      </div>
    </header>
  );
}
