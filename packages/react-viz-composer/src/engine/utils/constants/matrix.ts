type Mat3 = Float32Array;

/** 单位矩阵（3×3 列主序） */
const IDENTITY_MAT3: Mat3 = new Float32Array([
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
]);

export { IDENTITY_MAT3, type Mat3 };
