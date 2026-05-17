import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'WorldLand',
  description: 'Decentralized GPU Infrastructure Network',
  
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,
  
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
    ['meta', { property: 'og:title', content: 'WorldLand Documentation' }],
    ['meta', { property: 'og:description', content: 'Decentralized GPU Infrastructure Network - DePIN for AI Era' }],
  ],
  
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'WorldLand',
    
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Documentation', link: '/executive-summary' },
      { text: 'Whitepaper', link: '/whitepaper/' },
      { 
        text: 'Links',
        items: [
          { text: 'Website', link: 'https://worldland.io' },
          { text: 'GitHub', link: 'https://github.com/worldland' },
          { text: 'Discord', link: '#' },
          { text: 'Twitter', link: '#' },
        ]
      }
    ],
    
    sidebar: [
      {
        text: 'Executive Summary',
        link: '/executive-summary',
      },
      {
        text: 'WorldLand Introduction',
        collapsed: false,
        items: [
          { text: 'Key Features', link: '/introduction/key-features' },
          { text: 'WLC Token ($WLC)', link: '/introduction/token' },
          { text: 'Important Links', link: '/introduction/links' },
          { text: 'FAQ', link: '/introduction/faq' },
        ]
      },
      {
        text: 'WorldLand Network',
        collapsed: false,
        items: [
          { text: 'WorldLand Core', link: '/network/core' },
          { text: 'The Provider', link: '/network/provider' },
          { text: 'The Broker', link: '/network/broker' },
          { text: 'Network Participants', link: '/network/participants' },
        ]
      },
      {
        text: 'WLC Tokenomics',
        collapsed: false,
        items: [
          { text: 'Token Overview', link: '/tokenomics/overview' },
          { text: 'Token Distribution', link: '/tokenomics/distribution' },
          { text: 'Token Vesting', link: '/tokenomics/vesting' },
          { text: 'Token Utility & Purpose', link: '/tokenomics/utility' },
          { text: 'Provider Rewards', link: '/tokenomics/provider-rewards' },
          { text: 'Reward Emissions', link: '/tokenomics/emissions' },
          { text: 'Circulating Supply', link: '/tokenomics/circulating-supply' },
          { text: 'KYC Verification', link: '/tokenomics/kyc' },
        ]
      },
      {
        text: 'WorldLand Cloud',
        collapsed: false,
        items: [
          { text: 'What is WorldLand Cloud', link: '/cloud/overview' },
          { 
            text: 'Provider Guide', 
            collapsed: true,
            items: [
              { text: 'How to Provide', link: '/cloud/provider/how-to-provide' },
              { text: 'Provider Policy', link: '/cloud/provider/policy' },
            ]
          },
          { 
            text: 'Customer Guide', 
            collapsed: true,
            items: [
              { text: 'How to Use', link: '/cloud/customer/how-to-use' },
              { text: 'Portal Guide', link: '/cloud/customer/portal-guide' },
            ]
          },
        ]
      },
      {
        text: 'Partnership',
        link: '/partnership/',
      },
      {
        text: 'Community',
        link: '/community/',
      },
      {
        text: 'Roadmap',
        link: '/roadmap/',
      },
      {
        text: 'Whitepaper',
        link: '/whitepaper/',
      },
    ],
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/worldland' },
      { icon: 'twitter', link: '#' },
      { icon: 'discord', link: '#' },
    ],
    
    search: {
      provider: 'local'
    },
    
    editLink: {
      pattern: 'https://github.com/worldland/docs/edit/main/:path',
      text: 'Edit this page on GitHub'
    },
    
    footer: {
      message: 'Decentralized GPU Infrastructure for the AI Era',
      copyright: 'Copyright © 2024 WorldLand'
    },
    
    lastUpdated: {
      text: 'Last updated'
    },
    
    docFooter: {
      prev: 'Previous',
      next: 'Next'
    },
    
    outline: {
      label: 'On this page',
      level: [2, 3]
    }
  }
})
