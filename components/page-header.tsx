import Link from "next/link";

type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="page-header">
      <Link href="/home">Back to Home</Link>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
