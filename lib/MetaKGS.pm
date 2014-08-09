package MetaKGS;
use 5.10.0;
use strict;
use warnings;
use parent qw/Amon2/;
use MetaKGS::Exception;
use MetaKGS::Teng;
use MetaKGS::Teng::Schema;

our $VERSION = '0.01';

__PACKAGE__->make_local_context;

sub teng {
    my $self = shift;
    $self->{teng} ||= $self->_build_teng;
}

sub _build_teng {
    my $self = shift;
    my $config = $self->config->{+__PACKAGE__} || {};

    MetaKGS::Teng->new(
        schema => MetaKGS::Teng::Schema->instance,
        # I suggest to enable following lines if you are using mysql.
        # on_connect_do => [
        #     'SET SESSION sql_mode=STRICT_TRANS_TABLES;',
        # ],
        %{ $config->{teng} || {} },
    );
}

1;

__END__

=head1 NAME

MetaKGS - MetaKGS

=head1 DESCRIPTION

This is a main context class for MetaKGS

=head1 AUTHOR

MetaKGS authors.

