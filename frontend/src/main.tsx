import React from 'react';
import ReactDOM from 'react-dom/client';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { I18nProvider, useI18n } from './i18n';
import App from './App';
import './styles.css';
import './styles/haven.css';

function LocalizedApp() {
  const { locale } = useI18n();
  return <ConfigProvider
      locale={locale === 'en' ? enUS : zhCN}
      theme={{
        token: {
          colorPrimary: '#1f4d45',
          colorSuccess: '#1f4d45',
          colorText: '#17211e',
          colorTextSecondary: '#5a6561',
          colorBorder: '#e2dfd6',
          borderRadius: 10,
          controlHeight: 39,
          fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        },
        components: {
          Button: { primaryShadow: 'none' },
          Table: { headerBg: '#f3f1e9', headerColor: '#5a6561', rowHoverBg: '#f7f6f2' },
          InputNumber: { activeShadow: '0 0 0 2px rgba(40,123,107,.08)' },
        },
      }}
    >
      <AntApp><App /></AntApp>
    </ConfigProvider>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><I18nProvider><LocalizedApp /></I18nProvider></React.StrictMode>,
);
