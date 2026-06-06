import { useRegisterSW } from 'virtual:pwa-register/react'; // eslint-disable-line

import { Modal } from '@/components/modal';

import styles from './reload.module.css';

export function ReloadModal() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const close = () => {
    setNeedRefresh(false);
  };

  return (
    <Modal show={needRefresh} onClose={close}>
      <h2 className={styles.title}>新内容</h2>
      <p className={styles.desc}>
        有新内容可用，点击重新加载按钮进行更新。
      </p>

      <div className={styles.buttons}>
        <button onClick={close}>关闭</button>

        <button
          className={styles.primary}
          onClick={() => updateServiceWorker(true)}
        >
          重新加载
        </button>
      </div>
    </Modal>
  );
}
