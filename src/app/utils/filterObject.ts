export const userResponse = (user: any) => {
  const { _id, name, email, role } = user;
  return { _id, name, email, role };
};
