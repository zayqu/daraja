import React, { useState } from 'react';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log(formData);
  };

  return (
    <section id="contact" className="py-20 px-6">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-dark-gray">Contact Us</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-xl font-semibold mb-4 text-dark-gray">Get in Touch</h3>
            <p className="mb-4 text-gray-600">Phone: (123) 456-7890</p>
            <p className="mb-4 text-gray-600">Email: info@daraja.co.tz</p>
            <p className="text-gray-600">Address: 123 Creative St, Design City, DC 12345</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded" required />
            <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded" required />
            <textarea name="message" placeholder="Message" value={formData.message} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded h-32" required></textarea>
            <button type="submit" className="bg-teal text-white px-6 py-3 rounded hover:bg-teal-600">Send Message</button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;