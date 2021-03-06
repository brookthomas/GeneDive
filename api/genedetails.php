<?php
  
  $pdo = new PDO( 'sqlite:../data/data.sqlite');

  $gid = $_GET['ids'];
  $query = "SELECT ngd.*, ifnull(amount,0) as count FROM ncbi_gene_data ngd LEFT JOIN interaction_count ic ON ngd.id = ic.gene_id WHERE ngd.id IN ( $gid );";

  $stmt = $pdo->prepare($query);

  $stmt->execute();

  echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>