class MockEncoder {
  encode(value) {
    return value;
  }
}
class MockDecoder {
  decode(value) {
    return value;
  }
}
global.TextEncoder = MockEncoder;
global.TextDecoder = MockDecoder;
