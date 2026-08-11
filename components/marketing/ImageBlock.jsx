import styles from './ImageBlock.module.css';

export default function ImageBlock({ src, alt, placeholder, className = '' }) {
  const hasPlaceholder = !!placeholder;
  return (
    <figure className={`${styles['mkt-image-block']} ${className} ${hasPlaceholder ? styles['mkt-image-block--blur'] : ''}`}>
      {placeholder && (
        <img
          src={placeholder}
          alt=""
          className={styles['mkt-image-block__placeholder']}
          style={{ filter: 'blur(20px)', transition: 'filter .3s' }}
        />
      )}
      <img
        src={src}
        alt={alt}
        className={styles['mkt-image-block__image']}
        style={{ opacity: 0, transition: 'opacity .3s' }}
        onLoad={(e) => {
          e.target.style.opacity = 1;
          if (placeholder) {
            e.target.previousSibling.style.filter = 'blur(0)';
          }
        }}
      />
    </figure>
  );
}