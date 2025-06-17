export const isReactNative = () => {
  try {
    require('react-native');
    return true;
  } catch (e) {
    return false;
  }
};
