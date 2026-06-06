import { BiMoney, BiUserCircle, BiLogoGithub } from 'react-icons/bi/index';
import { BsSoundwave, BsStars } from 'react-icons/bs/index';
import { RxMixerHorizontal } from 'react-icons/rx/index';

import { Balancer } from 'react-wrap-balancer';

import { Container } from '@/components/container';
import { count as soundCount } from '@/lib/sounds';

import styles from './features.module.css';

export function Features() {
  const count = soundCount();

  const features = [
    {
      Icon: BiMoney,
      body: '免费沉浸于声音世界。',
      id: 'free-access',
      label: '免费使用',
    },
    {
      Icon: BiUserCircle,
      body: '无需注册，直接开始使用。',
      id: 'no-registration',
      label: '无需注册',
    },
    {
      Icon: BsSoundwave,
      body: `探索 ${count} 种独特音景，从雨林到城市。`,
      id: 'diverse-sounds',
      label: '丰富音效',
    },
    {
      Icon: RxMixerHorizontal,
      body: '自由混合调节声音，打造专属音景。',
      id: 'customizable-mixes',
      label: '自定义混音',
    },
    {
      Icon: BiLogoGithub,
      body: '参与贡献与协作，让产品更出色。',
      id: 'open-source',
      label: '开源项目',
      link: {
        label: '源代码',
        url: 'https://github.com/remvze/moodist',
      },
    },
    {
      Icon: BsStars,
      body: '沉浸式体验，专注于声音本身。',
      id: 'seamless-experience',
      label: '流畅体验',
    },
    {
      Icon: BsStars,
      body: '轻松分享您的定制声音组合。',
      id: 'share-selections',
      label: '分享选择',
    },
    {
      Icon: BsStars,
      body: '保存您喜爱的混音，随时快速回归。',
      id: 'save-presets',
      label: '保存预设',
      soon: true,
    },
  ];

  return (
    <section className={styles.featuresSection}>
      <Container>
        <div className={styles.iconContainer}>
          <div className={styles.tail} />
          <div className={styles.icon}>
            <BsStars />
          </div>
        </div>

        <h2 className={styles.title}>功能特色</h2>

        <div className={styles.features}>
          {features.map(feature => (
            <div className={styles.reason} key={feature.id}>
              <div className={styles.icon}>
                <feature.Icon />
              </div>
              <h3 className={styles.label}>{feature.label}</h3>
              <p className={styles.body}>
                <Balancer>{feature.body}</Balancer>
              </p>

              {feature.link && (
                <a className={styles.link} href={feature.link.url}>
                  {feature.link.label}
                </a>
              )}

              {feature.soon && <div className={styles.soon}>即将推出</div>}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
