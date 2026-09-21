import { TextStyle } from 'react-native';

export const TYPOGRAPHY = {
  h1: {
    fontSize: 26,
    fontWeight: '800' as TextStyle['fontWeight'],
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 21,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 21,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 18,
  },
  captionBold: {
    fontSize: 13,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 18,
  },
  micro: {
    fontSize: 11,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 14,
  },
};

