import React from 'react';

const Services = () => {
  const services = [
    { 
      title: 'Web Design', 
      icon: '🌐', 
      description: 'Custom websites tailored to your brand.',
      link: '#portfolio',
      hasButton: false
    },
    { 
      title: 'Graphic Design', 
      icon: '🎨', 
      description: 'Eye-catching visuals for all your needs.',
      link: '#portfolio',
      hasButton: false
    },
    { 
      title: 'Jobs Platform', 
      icon: '💼', 
      description: 'Connect with top opportunities.',
      link: 'https://jobs.daraja.co.tz',
      hasButton: true
    },
    { 
      title: 'CV/Resume Builder', 
      icon: '📄', 
      description: 'Build professional resumes effortlessly.',
      link: 'https://cv.daraja.co.tz',
      hasButton: true
    },
  ];

  const handleRedirect = (url) => {
    if (url.startsWith('#')) {
      document.querySelector(url).scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = url;
    }
  };

  return (
    <section id="services" className="py-20 px-6 bg-gray-100">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-dark-gray">Our Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <div 
              key={index} 
              className={`bg-white p-6 rounded-lg shadow-md text-center hover:shadow-lg transition-shadow ${!service.hasButton ? 'cursor-pointer' : ''}`}
              onClick={!service.hasButton ? () => handleRedirect(service.link) : undefined}
            >
              <div className="text-4xl mb-4">{service.icon}</div>
              <h3 className="text-xl font-semibold mb-2 text-dark-gray">{service.title}</h3>
              <p className="text-gray-600 mb-4">{service.description}</p>
              {service.hasButton && (
                <button 
                  onClick={() => handleRedirect(service.link)}
                  className="bg-teal text-white px-4 py-2 rounded hover:bg-teal-600 transition-colors"
                >
                  Learn More
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;