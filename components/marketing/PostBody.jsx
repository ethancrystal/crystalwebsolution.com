import { Fragment } from 'react';
import Link from 'next/link';

import { parseMarkdown } from '../../lib/blogMarkdown.mjs';

// Renders a parsed post body as React elements.
//
// There is no dangerouslySetInnerHTML anywhere in this file, and that is the
// point: post bodies are author input, and turning them into an HTML string
// would mean something downstream has to trust that string. Instead
// lib/blogMarkdown.mjs produces tokens and this component maps each token to an
// element, so React's own escaping covers every text node for free.

function renderInline(tokens, keyPrefix) {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (token.type) {
      case 'strong':
        return <strong key={key}>{renderInline(token.children, key)}</strong>;
      case 'em':
        return <em key={key}>{renderInline(token.children, key)}</em>;
      case 'code':
        return (
          <code key={key} className="post-inline-code">
            {token.value}
          </code>
        );
      case 'link': {
        const external = /^https?:\/\//i.test(token.href);
        // Internal links use next/link for client navigation; external ones get
        // noopener so the opened page cannot reach back through window.opener.
        return external ? (
          <a key={key} href={token.href} target="_blank" rel="noopener noreferrer">
            {renderInline(token.children, key)}
          </a>
        ) : (
          <Link key={key} href={token.href}>
            {renderInline(token.children, key)}
          </Link>
        );
      }
      default:
        return <Fragment key={key}>{token.value}</Fragment>;
    }
  });
}

export default function PostBody({ body }) {
  const blocks = parseMarkdown(body);

  if (!blocks.length) return null;

  return (
    <div className="post-body">
      {blocks.map((block, index) => {
        const key = `block-${index}`;

        switch (block.type) {
          case 'heading': {
            // Author headings start at h2 — the post title owns the only h1, so
            // the document outline stays valid for screen readers and crawlers.
            const Tag = block.level === 2 ? 'h2' : 'h3';
            return <Tag key={key}>{renderInline(block.children, key)}</Tag>;
          }
          case 'list':
            return block.ordered ? (
              <ol key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    {renderInline(item, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    {renderInline(item, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ul>
            );
          case 'blockquote':
            return <blockquote key={key}>{renderInline(block.children, key)}</blockquote>;
          case 'code':
            return (
              <pre key={key} className="post-code">
                <code>{block.value}</code>
              </pre>
            );
          case 'rule':
            return <hr key={key} className="post-rule" />;
          default:
            return <p key={key}>{renderInline(block.children, key)}</p>;
        }
      })}
    </div>
  );
}
