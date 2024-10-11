const fs = require('fs');
const Books = require('../models/Books');

exports.createBooks = (req, res, next) => {
  const booksObject = JSON.parse(req.body.book);
  delete booksObject._id;
  delete booksObject._userId;

  const books = new Books({
      ...booksObject,
      userId : req.auth.userId,
      grade: 0,
      averageRating :0,
      imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  });

  books.save()
  .then(() => { res.status(201).json({
        message: 'Book saved successfully!'
      });
    }
  ).catch((error) => {res.status(400).json({
        error: error
      });
    }
  );
};


exports.getOneBooks = (req, res, next) => {
  Books.findOne({ _id: req.params.id })
    .then(books => 
    // Renvoie les détails du livre, y compris la moyenne des note
      res.status(200).json(books))
    .catch(error => 
      res.status(404).json({ error }));
};



exports.modifyBooks = (req, res, next) => {
  const booksObject = req.file ? {
      ...JSON.parse(req.body.books),
      imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  } : { ...req.body };

  delete booksObject._userId;
  Books.findOne({_id: req.params.id})
      .then((books) => {
          if (books.userId != req.auth.userId) {
              res.status(401).json({ message : 'Not authorized'});
          } else {
              Books.updateOne({ _id: req.params.id}, { ...booksObject, _id: req.params.id})
              .then(() => res.status(200).json({message : 'Book modifié!'}))
              .catch(error => res.status(401).json({ error }));
          }
      })
      .catch((error) => {
          res.status(400).json({ error });
      });
};


  

exports.deleteBooks = (req, res, next) => {
  Books.findOne({ _id: req.params.id})
      .then(books => {
          if (books.userId != req.auth.userId) {
              res.status(401).json({message: 'Not authorized'});
          } else {
              const filename = books.imageUrl.split('/images/')[1];
              fs.unlink(`images/${filename}`, () => {
                  Books.deleteOne({_id: req.params.id})
                      .then(() => { res.status(200).json({message: 'Objet supprimé !'})})
                      .catch(error => res.status(401).json({ error }));
              });
          }
      })
      .catch( error => {
          res.status(500).json({ error });
      });
};
  

  exports.getAllBooks = (req, res, next) => {
    Books.find()
    .then((books) => { 
      // Renvoie tous les livres, y compris la moyenne des notes
      res.status(200).json(books);
      })
    .catch((error) => {
      res.status(400).json({error: error});
      });
  };


  exports.getbestratingBooks = (req, res, next) => {
    Books.find()
    .then((books) => { res.status(200).json(books);
      })
    .catch(
      (error) => {res.status(400).json({error: error});
      }
    );
  };
  


  exports.ratingBooks = (req, res, next) => {
    const userId = req.auth.userId;
    const rating = req.body.rating;
  
    // Vérifie que la note est valide
    if (rating < 0 || rating > 5) {
      return res.status(400).json({ message: 'La note doit être entre 0 et 5.' });
    }
  
    Books.findOne({ _id: req.params.id })
      .then(book => {
        if (!book) {
          return res.status(404).json({ message: 'Livre non trouvé.' });
        }
  
        // Vérifie si l'utilisateur a déjà noté ce livre
        const existingRating = book.ratings.find(r => r.userId === userId);
        if (existingRating) {
          return res.status(400).json({ message: 'Vous avez déjà noté ce livre.' });
        }
  
        // Ajoute la nouvelle note
        book.ratings.push({ userId: userId, rating: rating });
  
        // Calcule la nouvelle moyenne
        const totalRatings = book.ratings.reduce((sum, rate) => sum + rate.rating, 0);
        book.averageRating = totalRatings / book.ratings.length;
  
        // Sauvegarde le livre mis à jour
        book.save()
          .then(() => res.status(200).json(book))
          .catch(error => res.status(400).json({ error }));
      })
      .catch(error => res.status(500).json({ error }));
  };
  