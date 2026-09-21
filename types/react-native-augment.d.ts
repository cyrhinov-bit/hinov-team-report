import React from 'react';
import 'react-native';

declare module 'react-native' {
  interface TouchableOpacityProps {
    key?: React.Key;
  }
  interface ViewProps {
    key?: React.Key;
  }
  interface TextProps {
    key?: React.Key;
  }
  interface ScrollViewProps {
    key?: React.Key;
  }
  interface TextInputProps {
    key?: React.Key;
  }
  interface ImageProps {
    key?: React.Key;
  }
}

