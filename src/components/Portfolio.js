import React from 'react';

const Portfolio = () => {
  const projects = [
    { title: 'E-commerce Website', image: 'https://via.placeholder.com/400x300?text=Project+1' },
    { title: 'Brand Identity', image: 'https://via.placeholder.com/400x300?text=Project+2' },
    { title: 'Mobile App UI', image: 'https://via.placeholder.com/400x300?text=Project+3' },
    { title: 'Logo Design', image: 'https://via.placeholder.com/400x300?text=Project+4' },
    { title: 'Portfolio Site', image: 'https://via.placeholder.com/400x300?text=Project+5' },
    { title: 'Marketing Campaign', image: 'https://via.placeholder.com/400x300?text=Project+6' },
  ];

  return (
    <section id="portfolio" className="py-20 px-6">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-dark-gray">Our Portfolio</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <div key={index} className="relative overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <img src={project.image} alt={project.title} className="w-full h-64 object-cover" />
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <h3 className="text-white text-xl font-semibold">{project.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Portfolio;