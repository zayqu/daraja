import React from 'react';

const Jobs = () => {
  const jobs = [
    { title: 'UI/UX Designer', company: 'Tech Corp' },
    { title: 'Graphic Designer', company: 'Creative Agency' },
    { title: 'Web Developer', company: 'Startup Inc' },
  ];

  return (
    <section id="jobs" className="py-20 px-6 bg-gray-100">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-dark-gray">Featured Jobs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {jobs.map((job, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2 text-dark-gray">{job.title}</h3>
              <p className="text-gray-600 mb-4">{job.company}</p>
              <button className="bg-teal text-white px-4 py-2 rounded hover:bg-teal-600">Apply Now</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Jobs;