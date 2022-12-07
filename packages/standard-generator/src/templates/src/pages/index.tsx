export default function ContentIndex() {
  throw new Error('This should never render.');
}

export const getServerSideProps = async function getServerSideProps() {
  try {
    return {
      redirect: {
        permanent: true,
        destination: '/mosaic/'
      }
    };
  } catch (e: any) {
    if (e.status === 404) {
      throw new Error(
        `No homepage found for this route. Cannot redirect to the correct destination.\n\n${e.statusText}`
      );
    }
    throw e;
  }
};
