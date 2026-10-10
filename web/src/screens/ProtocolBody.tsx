/* Corpo de um protocolo em Markdown. Carregado sob demanda (React.lazy) para o react-markdown ficar fora do bundle inicial.
   - imagens e links relativos são resolvidos para a pasta do arquivo (publicada junto com o app, disponível offline);
   - links para outro .md da pasta abrem o protocolo dentro do app, sem sair para o navegador. */
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { href } from '@/lib/router';
import { assetBase, linkedSlug } from '@/lib/protocols';

export default function ProtocolBody({ body, file, knownSlugs }: { body: string; file: string; knownSlugs: Set<string> }) {
  const base = assetBase(file);
  const resolve = (url: string) => {
    const u = defaultUrlTransform(url);
    if (!u || /^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith('/') || u.startsWith('#')) return u;
    return base + u;
  };
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={resolve}
      components={{
        a: ({ href: h, children }) => {
          const slug = h ? linkedSlug(h) : null;
          if (slug && knownSlugs.has(slug)) return <a href={href('protocolo', { id: slug })}>{children}</a>;
          return <a href={h} target={h?.startsWith('#') ? undefined : '_blank'} rel="noopener">{children}</a>;
        },
        img: ({ src, alt }) => <img src={src} alt={alt || ''} loading="lazy" className="my-3 h-auto max-w-full rounded-xl" />,
      }}
    >
      {body}
    </ReactMarkdown>
  );
}
