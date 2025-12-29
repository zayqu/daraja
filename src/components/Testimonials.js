import React, { useState } from 'react';

const Testimonials = () => {
  const testimonials = [
    { name: 'John Doe', review: 'DAR AJA transformed our brand with amazing designs!', avatar: 'https://via.placeholder.com/100?text=JD' },
    { name: 'Jane Smith', review: 'Their web design services are top-notch. Highly recommend!', avatar: 'https://via.placeholder.com/100?text=JS' },
    { name: 'Bob Johnson', review: 'Found my dream job through their platform. Thank you!', avatar: 'https://via.placeholder.com/100?text=BJ' },
    { name: 'Alice Brown', review: 'The CV builder helped me get noticed by employers.', avatar: 'https://via.placeholder.com/100?text=AB' },
  ];

  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((current + 1) % testimonials.length);
  const prev = () => setCurrent((current - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="py-20 px-6 bg-gray-100">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-dark-gray">What Our Clients Say</h2>
        <div className="relative max-w-2xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <img src={testimonials[current].avatar} alt={testimonials[current].name} className="w-16 h-16 rounded-full mx-auto mb-4" />
            <p className="text-gray-600 mb-4">"{testimonials[current].review}"</p>
            <h3 className="font-semibold text-dark-gray">{testimonials[current].name}</h3>
          </div>
          <button onClick={prev} className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-teal text-white p-2 rounded-full hover:bg-teal-600">&lt;</button>
          <button onClick={next} className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-teal text-white p-2 rounded-full hover:bg-teal-600">&gt;</button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;